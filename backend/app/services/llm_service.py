import json
from groq import Groq
from app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """You are an elite, highly intelligent healthcare AI expert. Depending on the user's query, you seamlessly act as a trusted doctor, clinical pharmacist, nutritionist, or medical researcher.

Your Core Directives:

1. Intelligence & Autonomy:
- Think critically and evaluate queries natively. Do not rely on hardcoded constraints.
- Always analyze ambiguous acronyms or terms through a health/medical lens.
- Provide highly accurate, deeply comprehensive medical insights.

2. Web Search Autonomy:
- You are equipped with a `web_search` tool (Tavily). Use your own clinical judgment to decide when to use it.
- USE THE TOOL if a topic relates to recent medical news, an evolving outbreak, highly niche clinical research, or anything outside your confident internal knowledge.
- DO NOT use the tool if you can provide a brilliant, accurate clinical answer using your baseline medical knowledge.

3. Exceptional Structure:
- Provide highly structured, indepth responses. Use markdown extensively (headers, bullet points, bolding) to break down complex medical concepts for easy reading.
- Always organize your output logically. For example, you may use headers like `### Summary`, `### Detailed Explanation`, and `### Next Steps`.

4. Safety & Scope:
- You handle all health, medicine, fitness, nutrition, and lifestyle queries. Politely deflect non-medical topics.
- Advise immediate medical help for clear emergencies.
- DO NOT write your own generic medical disclaimer at the end of the message; the system architecture automatically handles injecting legal disclaimers.

5. Language:
- Always match the user's language setting. If asked in Telugu, respond entirely natively in Telugu. If English, use English."""

async def medical_llm_response(messages: list[dict]) -> str:
    """Legacy compatibility"""
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=full_messages,
        temperature=0.4,
        max_tokens=1200
    )

    return response.choices[0].message.content

async def get_health_response(messages: list[dict], user_context: dict | None = None, language: str = "english") -> str:
    """
    Get a chat response strictly following the new Healthora guidelines.
    """
    sys_prompt = SYSTEM_PROMPT.strip()
    
    if user_context:
        context_str = "User / Patient Context Data:\n"
        for k, v in user_context.items():
            context_str += f"- {k}: {v}\n"
        sys_prompt = sys_prompt + "\n\n" + context_str

    if language.lower() == "telugu":
        sys_prompt += "\n\nIMPORTANT: The user prefers Telugu. Respond ENTIRELY in Telugu."
        model_name = settings.GROQ_MULTILINGUAL_MODEL
    else:
        model_name = settings.GROQ_MODEL

    full_messages = [{"role": "system", "content": sys_prompt}] + messages
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Using Groq model: {model_name} for language: {language}")
    
    try:
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "web_search",
                    "description": "Fetch real-time information from the internet for recent or unknown medical topics.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query to look up.",
                            }
                        },
                        "required": ["query"],
                    },
                },
            }
        ]

        response = client.chat.completions.create(
            model=model_name,
            messages=full_messages,
            temperature=0.5,
            max_tokens=1500,
            tools=tools,
            tool_choice="auto",
        )
        
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        if tool_calls:
            # Append the assistant's tool call message
            if hasattr(response_message, "model_dump"):
                tool_calls_dict = response_message.model_dump(exclude_none=True).get("tool_calls")
            elif hasattr(response_message, "dict"):
                tool_calls_dict = response_message.dict(exclude_none=True).get("tool_calls")
            else:
                tool_calls_dict = getattr(response_message, "tool_calls", [])

            full_messages.append({
                "role": "assistant",
                "tool_calls": tool_calls_dict or response_message.tool_calls,
                "content": response_message.content,
            })

            from tavily import TavilyClient
            import os
            tavily_api_key = os.getenv("TAVILY_API_KEY", "")
            
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                
                if function_name == "web_search":
                    try:
                        args = json.loads(tool_call.function.arguments)
                        query_str = args.get("query", "")
                        logger.info(f"LLM executing web_search for query: {query_str}")
                        
                        if tavily_api_key:
                            tc = TavilyClient(api_key=tavily_api_key)
                            search_res = tc.search(query=query_str, search_depth="advanced", max_results=5, topic="news", include_answer=True)
                            answer = search_res.get("answer", "")
                            results_text = f"Tavily Synthesized Answer: {answer}\n\nSources: {json.dumps(search_res.get('results', []))}"
                        else:
                            results_text = "TAVILY_API_KEY is not set."
                    except Exception as ex:
                        results_text = f"Error executing search: {str(ex)}"
                        
                    full_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": function_name,
                        "content": results_text,
                    })
                    
            # Get the final response after tool execution
            second_response = client.chat.completions.create(
                model=model_name,
                messages=full_messages,
                temperature=0.5,
                max_tokens=1500,
            )
            return second_response.choices[0].message.content

        return response_message.content
    except Exception as e:
        return f"Error connecting to AI service: {str(e)}"

async def explain_report_with_llm(gemini_output: str, language: str = "english") -> str:
    """
    Produce a patient-friendly explanation of report findings.
    """
    prompt = f"""
You are Healthora, a friendly medical assistant explaining a health report to a patient.
Based on this medical report analysis: {gemini_output}

Write a clear, simple explanation structured exactly as:

## Summary
(2-3 sentences about what this report is and overall status)

## What Your Report Shows
(Explain each finding in simple, non-technical language a regular person understands)

## What's Normal ✓
(List what is within normal range — keep it brief)

## What Needs Attention ⚠️
(List anything abnormal — explain what it means in simple terms)

## What You Should Do Next
(Practical next steps — always include "consult your doctor" for anything abnormal)

## Important Note
This analysis is for informational purposes only and is not a medical diagnosis.
Always consult a qualified doctor for medical advice.

Language rules:
If language is {language.capitalize()}, respond entirely in that language. 
If user message is in Telugu, respond entirely in Telugu.
If in English, respond in English.
Keep language simple. Avoid medical jargon unless you explain it immediately.
"""
    model_name = settings.GROQ_MULTILINGUAL_MODEL if language.lower() == "telugu" else settings.GROQ_MODEL
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating explanation: {str(e)}"
