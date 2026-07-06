from qdrant_client import QdrantClient
from embeddings import get_embedding

client = QdrantClient(
    host="localhost",
    port=6333
)


def retrieve(query, k=10):

    query_embedding = get_embedding(query)

    results = client.query_points(
    collection_name="repo_chunks",
    query=query_embedding.tolist(),
    limit=k
)
    

    return results

