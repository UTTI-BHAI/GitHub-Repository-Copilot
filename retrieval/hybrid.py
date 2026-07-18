from retrieval.retrieve import retrieve
from retrieval.keyword_search import keyword_search
from retrieval.rrf import rrf_fusion


def hybrid_search(query, collection_name):
    """
    Vector + BM25 retrieval, both scoped to one repository's collection.

    The all_chunks parameter is gone — BM25 now reads from Qdrant via
    chunk_store instead of an in-memory list passed down from the caller.
    """
    vector_results = retrieve(query, collection_name)

    keyword_results = keyword_search(query, collection_name, top_k=5)

    fused = rrf_fusion(vector_results, keyword_results)

    print("\nRRF RESULTS\n")

    for item in fused[:10]:
        print(item["chunk"]["name"], round(item["score"], 4))

    return fused