from mistralai import Mistral
import os   
from dotenv import load_dotenv
import json
import csv
import logging
import time
from time import sleep
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
    # print(md)
    
    formatting = """
    {
        "correct_name": "string",
        "company_still_exists": "boolean",
        "is_in_eu": "boolean",
    }
    """

    sleep(1)

    max_retries = 5
    backoff = 1  # initial backoff in seconds

    for attempt in range(max_retries):
        try:
            response = mistral_client.beta.conversations.append(
                conversation_id=response.conversation_id,
                inputs=f"Please check if the name is correct and if the company still exists. The name is {name} and is replaces the service: {service_name}. Return a json object with this format:\n{formatting}\n\ndata:\n{md}"
            )
            break  # Success, exit the retry loop
        except Exception as e:
            # Check for 429 status code in the exception (assume e has .status or .status_code)
            status_code = getattr(e, "status", None) or getattr(e, "status_code", None)
            if status_code == 429:
                if attempt < max_retries - 1:
                    logging.warning(f"Received 429 Too Many Requests. Retrying in {backoff} seconds...")
                    time.sleep(backoff)
                    backoff *= 2  # Exponential backoff
                    continue
                else:
                    logging.error("Max retries reached for 429 Too Many Requests. Skipping.")
                    response = None
                    break
            else:
                logging.error(f"Error during Mistral API call: {e}")
                response = None
                break

    print(response.outputs[0])

    # Check if there is content in response.outputs[0]
    if not hasattr(response, "outputs") or not response.outputs or not hasattr(response.outputs[0], "content") or not response.outputs[0].content:
        print("No content present in response.outputs[0]. Returning None.")
        return None
    response_content = response.outputs[0].content

    if "```json" in response_content:
        response_content = response_content.split("```json")[1].split("```")[0]
        response_content = json.loads(response_content)
        print(response_content)
    else:
        print("No JSON found in the response")
        return None
    
    # Failsafe: if response_content is a list/array, return None (name too ambiguous)
    if isinstance(response_content, list):
        print("Response content is a list/array, name too ambiguous. Skipping.")
        return None
    
    print("\nResponse content:")
    print(response_content['correct_name'])
    print(response_content['company_still_exists'])
    print(response_content['is_in_eu'])

    return response_content
    

def main():

    with open('european_alternatives_final.json', 'r') as f:
        data = json.load(f)

    for service in data['services']:
        service_name = service.get('service_name', 'Unknown')
        alternatives = service.get('alternatives', [])
        
        for alternative in alternatives:
            # print(alternative)
            # {'name': 'Modern', 'country': '', 'is_eu_member': False, 'is_efta_member': False, 'is_eu_hosted': False, 'has_free_plan': False, 'is_open_source': True, 'website_url': '', 'description': 'Modern European Open-Source Time TrackerModern European Open-Source Time Tracker for Freelancers and Agencies', 'features': []}

            response = web_search_agent("Please find all information about the service " + alternative['name'], alternative['name'], service_name)

            if response is None:
                print("We couldn't find a correct alternative")
                continue

            # INSERT_YOUR_CODE

            # Prepare the enhanced row by copying all original alternative info
            enhanced_row = alternative.copy()

            # Overwrite with verified/corrected info from response
            # (Assume response keys: 'correct_name', 'company_still_exists', 'is_in_eu')
            enhanced_row['name'] = response.get('correct_name', enhanced_row.get('name', ''))
            enhanced_row['company_still_exists'] = response.get('company_still_exists', '')
            enhanced_row['is_eu_member'] = response.get('is_in_eu', '')

            if not enhanced_row['company_still_exists'] or not enhanced_row['is_eu_member']:
                print("Found a service which either doesn't exists or isn't an EU based one, skipping ...")
                continue

            # Add service context for clarity
            enhanced_row['service_name'] = service_name

            # Write header if file is empty, else append row
            csv_file = 'european_alternatives_verified_final.csv'
            fieldnames = list(enhanced_row.keys())

            # Check if file is empty or needs header
            try:
                with open(csv_file, 'r', newline='', encoding='utf-8') as checkfile:
                    has_header = checkfile.readline().strip() != ""
            except FileNotFoundError:
                has_header = False

            with open(csv_file, 'a', newline='', encoding='utf-8') as f_out:
                writer = csv.DictWriter(f_out, fieldnames=fieldnames)
                if not has_header:
                    writer.writeheader()
                writer.writerow(enhanced_row)

if __name__ == "__main__":
    main()
    