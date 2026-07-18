from embeddings import get_embedding
from vector_store import client


def retrieve(query, collection_name, k=10):
    """
    Semantic search against ONE repository's collection.

    collection_name is now required and explicit — previously this always
    queried the shared "repo_chunks" collection, so results could come from
    any indexed repository.
    """
    # CODE_RETRIEVAL_QUERY embeds a natural-language question for matching
    # against code, which is the asymmetric counterpart to the
    # RETRIEVAL_DOCUMENT embeddings written during indexing.
    query_embedding = get_embedding(query, task_type="CODE_RETRIEVAL_QUERY")

    results = client.query_points(
        collection_name=collection_name,
        query=query_embedding,
        limit=k,
    )

    return results