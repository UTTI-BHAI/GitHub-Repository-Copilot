from clone_repo import clone_repository
from read_files import get_source_files, read_file
from chunker import extract_chunks
from embeddings import get_embedding
from llm.generate import generate_answer
from retrieval.hybrid import hybrid_search
from retrieval.dependency import get_dependencies
from llm.rewrite import rewrite_question

from qdrant_client.models import PointStruct

from vector_store import (
    client,
    ensure_collection,
    collection_point_count,
)
import chunk_store


def index_repository(url, collection_name):
    """
    Clone, chunk, and embed a repository into its OWN Qdrant collection.

    Returns nothing. Chunks are no longer handed back to the caller — Qdrant
    is the source of truth, and retrieval reads from it via chunk_store.

    Cloning and chunking are skipped entirely when the collection is already
    populated, so re-opening an indexed repository does no filesystem work.
    """
    ensure_collection(collection_name)

    if collection_point_count(collection_name) > 0:
        print(f"{collection_name} already indexed - skipping")
        return

    all_chunks = []

    repo_path = clone_repository(url)
    files = get_source_files(repo_path)

    for file in files:
        content = read_file(file)
        chunks = extract_chunks(content, file)
        all_chunks.extend(chunks)

    print(f"Indexing {len(all_chunks)} chunks into {collection_name}")

    points = []

    for i, chunk in enumerate(all_chunks):

        text_to_embed = f"""
        File: {chunk['file']}
        Name: {chunk['name']}
        Type: {chunk['type']}

        Code:
        {chunk['code']}
        """

        embedding = get_embedding(text_to_embed)

        points.append(
            PointStruct(
                id=i + 1,
                vector=embedding.tolist(),
                payload={
                    "name": chunk["name"],
                    "type": chunk["type"],
                    "file": chunk["file"],
                    "code": chunk["code"],
                },
            )
        )

        # Batch upserts instead of one network round-trip per chunk.
        if len(points) >= 128:
            client.upsert(collection_name=collection_name, points=points)
            points = []

    if points:
        client.upsert(collection_name=collection_name, points=points)

    # Drop any cache built before this collection was populated.
    chunk_store.invalidate(collection_name)


def ask_question(query, chat_history, collection_name):

    rewritten_query = rewrite_question(query, chat_history)

    print(f"\nRewritten Query: {rewritten_query}")

    rrf_results = hybrid_search(rewritten_query, collection_name)

    merged = []

    for item in rrf_results[:5]:
        merged.append(item["chunk"])

    dependency_chunks = get_dependencies(merged, collection_name)

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

    return answer