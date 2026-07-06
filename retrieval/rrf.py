def rrf_fusion(
    vector_results,
    keyword_results,
    k=60
):

    scores = {}

    # Vector results
    for rank, point in enumerate(
        vector_results.points,
        start=1
    ):

        chunk = point.payload

        chunk_id = (
            chunk["file"] +
            chunk["name"]
        )

        if chunk_id not in scores:

            scores[chunk_id] = {
                "score": 0,
                "chunk": chunk
            }

        scores[chunk_id]["score"] += (
            1 / (k + rank)
        )

    # BM25 results
    for rank, (chunk, bm25_score) in enumerate(
        keyword_results,
        start=1
    ):

        chunk_id = (
            chunk["file"] +
            chunk["name"]
        )

        if chunk_id not in scores:

            scores[chunk_id] = {
                "score": 0,
                "chunk": chunk
            }

        scores[chunk_id]["score"] += (
            1 / (k + rank)
        )

    ranked = sorted(
        scores.values(),
        key=lambda x: x["score"],
        reverse=True
    )

    return ranked