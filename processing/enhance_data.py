from mistralai import Mistral
import os   
from dotenv import load_dotenv
import json
load_dotenv()


mistral_client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

websearch_agent = mistral_client.beta.agents.create(
    model="mistral-medium-2505",
    description="Agent able to search information over the web",
    name="Websearch Agent",
    instructions="You have the ability to perform web searches with `web_search` to find up-to-date information.",
    tools=[{"type": "web_search"}],
    completion_args={
        "temperature": 0.1,
        "top_p": 0.95,
    }
)


def web_search_agent(query: str, name: str, service_name: str) -> dict:

    response = mistral_client.beta.conversations.start(
        agent_id=websearch_agent.id,
        inputs=query
    )

    # Convert response to dict if it has a model_dump method
    if hasattr(response, 'model_dump'):
        response_dict = response.model_dump()
    else:
        response_dict = response

    
    md = ''
    # Find the message output in the outputs
    for output in response_dict["outputs"]:
        if output["type"] == "message.output":
            content = output["content"]
            
            # Handle case where content is a simple string
            if isinstance(content, str):
                md += content
            # Handle case where content is a list of structured items
            elif isinstance(content, list):
                for index, item in enumerate(content):
                    if item["type"] == "text":
                        md += item["text"] + ("\n\nSources:" if index == 0 else "\n\n")
                    elif item["type"] == "tool_reference":
                        md += f"* {item['title']} [{item['url']}]\n"
            break
    print(md)
    
    formatting = """
    {
        "correct_name": "string",
        "company_still_exists": "boolean",
        "is_in_eu": "boolean",
    }
    """

    response = mistral_client.beta.conversations.append(
        conversation_id=response.conversation_id,
        inputs=f"Please check if the name is correct and if the company still exists. The name is {name} and is replaces the service: {service_name}. Return a json object with this format:\n{formatting}\n\ndata:\n{md}"
    )

    response_content = response.outputs[0].content

    if "```json" in response_content:
        response_content = response_content.split("```json")[1].split("```")[0]
        response_content = json.loads(response_content)
        print(response_content)
    else:
        print("No JSON found in the response")
        return None
    
    print("\nResponse content:")
    print(response_content['correct_name'])
    print(response_content['company_still_exists'])
    print(response_content['is_in_eu'])
    

def main():

    with open('european_alternatives_final.json', 'r') as f:
        data = json.load(f)


    for service in data['services']:
        service_name = service.get('service_name', 'Unknown')
        alternatives = service.get('alternatives', [])
        
        for alternative in alternatives[1:]:
            # print(alternative)
            # {'name': 'Modern', 'country': '', 'is_eu_member': False, 'is_efta_member': False, 'is_eu_hosted': False, 'has_free_plan': False, 'is_open_source': True, 'website_url': '', 'description': 'Modern European Open-Source Time TrackerModern European Open-Source Time Tracker for Freelancers and Agencies', 'features': []}

            web_search_agent("Please find all information about the service " + alternative['name'], alternative['name'], service_name)

            break

        break

if __name__ == "__main__":
    main()
    