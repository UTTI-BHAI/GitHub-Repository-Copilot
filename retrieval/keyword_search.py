from rank_bm25 import BM25Okapi


def keyword_search(query, chunks, top_k=5):

    documents = []

    for chunk in chunks:

        text = f"""
        {chunk["name"]}
        {chunk["type"]}

        """

        documents.append(
            text.split()
        )
    

    bm25 = BM25Okapi(documents)

    scores = bm25.get_scores(
        query.split()
    )

    ranked = sorted(
        zip(chunks, scores),
        key=lambda x: x[1],
        reverse=True
    )

    ranked = [
        (chunk, score)
        for chunk, score in ranked
        if score > 0
    ]

    return ranked[:top_k]