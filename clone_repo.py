from git import Repo
import os

def clone_repository(repo_url):
    repo_name = repo_url.split("/")[-1].replace(".git", "")

    clone_path = os.path.join("repos", repo_name)

    if not os.path.exists("repos"):
        os.makedirs("repos")

    if os.path.exists(clone_path):
        print("Repository already exists")
        return clone_path

    Repo.clone_from(repo_url, clone_path)

    print("Repository cloned successfully")

    return clone_path