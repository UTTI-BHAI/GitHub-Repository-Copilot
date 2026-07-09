from clone_repo import clone_repository
from read_files import get_source_files, read_file
from chunker import extract_chunks
from embeddings import get_embedding
from llm.generate import generate_answer
from retrieval.hybrid import hybrid_search
from retrieval.dependency import get_dependencies
from llm.rewrite import rewrite_question



from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams
from qdrant_client.models import PointStruct

client = QdrantClient(
    host="localhost",
    port=6333
)

collections = client.get_collections()

if "repo_chunks" not in [
    c.name for c in collections.collections
]:
    client.create_collection(
        collection_name="repo_chunks",
        vectors_config=VectorParams(
            size=384,
            distance="Cosine"
        )
    )

collection_info = client.get_collection(
    "repo_chunks"
)

print(
    f"Points stored: {collection_info.points_count}"
)

def index_repository(url):
    all_chunks = []
    repo_path = clone_repository(url)

    files = get_source_files(repo_path)

    for file in files:
        content = read_file(file)

        chunks = extract_chunks(content, file)  

        all_chunks.extend(chunks)

    if collection_info.points_count == 0:

        print(len(all_chunks))

        for i, chunk in enumerate(all_chunks):

            text_to_embed = f"""
            Name: {chunk['name']}
            Type: {chunk['type']}

            Code:
            {chunk['code']}
            """

            embedding = get_embedding(text_to_embed)

            client.upsert(
                collection_name="repo_chunks",
                points=[
                    PointStruct(
                        id=i+1,
                        vector=embedding.tolist(),
                        payload={
                            "name": chunk["name"],
                            "type": chunk["type"],
                            "file": chunk["file"],
                            "code": chunk["code"]
                        }
                    )
                ]
            )
    return all_chunks
def ask_question(
    query,
    all_chunks,
    chat_history
):

    rewritten_query = rewrite_question(
        query,
        chat_history
    )

    print(f"\nRewritten Query: {rewritten_query}")

    rrf_results = hybrid_search(
        rewritten_query,
        all_chunks
    )

    merged = []

    for item in rrf_results[:5]:
        merged.append(item["chunk"])

    dependency_chunks = get_dependencies(
        merged,
        all_chunks
    )

    merged.extend(dependency_chunks)

    unique = {}

    for chunk in merged:

        key = chunk["file"] + chunk["name"]

        unique[key] = chunk

    merged = list(unique.values())

    context = ""

    for chunk in merged:

        context += f"""
        FILE: {chunk["file"]}
        TYPE: {chunk["type"]}
        NAME: {chunk["name"]}

        CODE:
        {chunk["code"]}

        ====================================
        """

    history_text = ""

    for item in chat_history[-5:]:

        history_text += f"""
        Previous User Question:
        {item["question"]}

        Relevant Functions:
        {", ".join(item["functions"])}

        ------------------------------------
        """

    prompt = f"""
        You are a repository code assistant.Explain the code what it is doing and how while keeping the answer related to question

        Answer ONLY using the retrieved code.
        If a function name is not present in the retrieved code,
        do not mention it.

        Do not speculate about behavior.

        Do not add examples.

        Do not add unknown behavior sections.

        Only describe functions, classes, and flows that appear
        in the retrieved code.
            Rules:
            - Prefer information from the retrieved code.
            - Mention exact function and class names.
            - Explain the flow between functions when possible.
            - If a function calls another function whose implementation is not shown,
            explain what can be inferred from the call.
            - Do not invent code that is not present.
            - If part of the behavior is missing, clearly state what is known and what is unknown.
            - Do not use external examples.
            - Do not generate sample code.

        Conversation History:
        Use this only to resolve references like "it", "this", "that", or "the function".

    {history_text}
        -------------------------------------------

        Current Retrieved Code:
    {context}
        -------------------------------------------

        current Question:
    {query}
        """
    print("Context length:", len(context))
    print("Prompt length:", len(prompt))
    answer = generate_answer(prompt)

    chat_history.append({
        "question": query,
        "functions": [chunk["name"] for chunk in merged]
        })

    return answer







