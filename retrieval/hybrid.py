from retrieval.retrieve import retrieve
from retrieval.keyword_search import keyword_search
from retrieval.rrf import rrf_fusion


def hybrid_search(
    query,
    chunks
):

    vector_results = retrieve(query)

    keyword_results = keyword_search(
        query,
        chunks,
        top_k=5
    )

    fused = rrf_fusion(
        vector_results,
        keyword_results
    )

    print("\nRRF RESULTS\n")

    for item in fused[:10]:

        print(
            item["chunk"]["name"],
            round(item["score"], 4)
        )

    return fused