from llm.generate import generate_answer


def rewrite_question(question, history):

    if len(history) == 0:
        return question

    history_text = ""

    for item in history[-3:]:
        history_text += f"User: {item['question']}\n"

    prompt = f"""
Rewrite the current question into a standalone question.

Previous Questions:
{history_text}

Current Question:
{question}

Return ONLY the rewritten question.
If the question is already standalone,
return it unchanged.
"""

    return generate_answer(prompt).strip()