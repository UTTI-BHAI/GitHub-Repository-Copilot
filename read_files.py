import os

def get_source_files(repo_path):

    source_files = []

    ignore_dirs = {
    ".git",
    "venv",
    "__pycache__",
    "node_modules",
    "docs",
    "docs_src",
    "tests",
    "scripts"
}

    for root, dirs, files in os.walk(repo_path):

        dirs[:] = [d for d in dirs if d not in ignore_dirs]

        for file in files:

            if file.endswith((".py", ".js", ".ts")):

                source_files.append(
                    os.path.join(root, file)
                )

    return source_files
def read_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except:
        return None