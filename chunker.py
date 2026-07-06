import ast

MAX_CLASS_SIZE = 15000


def extract_chunks(source_code, file_path):

    chunks = []

    try:
        tree = ast.parse(source_code)

        for node in tree.body:

            # Standalone Functions
            if isinstance(node, ast.FunctionDef):

                chunks.append({
                    "type": "function",
                    "name": node.name,
                    "file": file_path,
                    "code": ast.get_source_segment(source_code, node)
                })

            elif isinstance(node, ast.AsyncFunctionDef):

                chunks.append({
                    "type": "async_function",
                    "name": node.name,
                    "file": file_path,
                    "code": ast.get_source_segment(source_code, node)
                })

            # Classes
            elif isinstance(node, ast.ClassDef):

                class_name = node.name

                class_code = ast.get_source_segment(
                    source_code,
                    node
                )

                # Store class chunk only if not huge
                if len(class_code) <= MAX_CLASS_SIZE:

                    chunks.append({
                        "type": "class",
                        "name": class_name,
                        "file": file_path,
                        "code": class_code
                    })

                # Store methods separately
                for child in node.body:

                    if isinstance(child, ast.FunctionDef):

                        chunks.append({
                            "type": "method",
                            "class": class_name,
                            "name": child.name,
                            "file": file_path,
                            "code": ast.get_source_segment(
                                source_code,
                                child
                            )
                        })

                    elif isinstance(
                        child,
                        ast.AsyncFunctionDef
                    ):

                        chunks.append({
                            "type": "async_method",
                            "class": class_name,
                            "name": child.name,
                            "file": file_path,
                            "code": ast.get_source_segment(
                                source_code,
                                child
                            )
                        })

    except Exception as e:
        print(e)

    return chunks