from embeddings import get_embedding
from vector_store import client


def retrieve(query, collection_name, k=10):
    query_embedding = get_embedding(query)

    results = client.query_points(
        collection_name=collection_name,
        query=query_embedding.tolist(),
        limit=k,
    )

    return results