import re

from retrieval.keyword_search import keyword_search


def get_dependencies(chunks, collection_name):
    """
    Regex-based dependency expansion.

    The all_chunks parameter is gone — lookups now go through BM25, which
    reads from the repository's Qdrant collection.

    Still heuristic (blocker G): a persistent dependency graph would be more
    accurate than regex plus a keyword lookup, but that is a separate change.
    """
    dependencies = []

    for chunk in chunks:
        code = chunk["code"]
        calls = re.findall(r"\.(\w+)\(", code)
        dependencies.extend(calls)

    extra_chunks = []
    seen = set()

    for dep in dependencies:

        if dep in seen:
            continue

        seen.add(dep)

        results = keyword_search(dep, collection_name, top_k=1)

        if not results:
            continue

        dep_chunk = results[0][0]

        # Don't retrieve the same function again
        if dep_chunk["name"] == dep:
            continue

        extra_chunks.append(dep_chunk)

    return extra_chunks