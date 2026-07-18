from chunk_store import get_bm25


def keyword_search(query, collection_name, top_k=5):
    """
    BM25 search scoped to one repository.

    Takes a collection name instead of an all_chunks list. The index is built
    once per repository and cached, rather than rebuilt on every query.
    """
    bm25, chunks = get_bm25(collection_name)

    if bm25 is None or not chunks:
        return []

    scores = bm25.get_scores(query.split())

    ranked = sorted(
        zip(chunks, scores),
        key=lambda x: x[1],
        reverse=True,
    )

    ranked = [
        (chunk, score)
        for chunk, score in ranked
        if score > 0
    ]

    return ranked[:top_k]