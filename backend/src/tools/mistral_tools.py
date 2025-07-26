import os
from dotenv import load_dotenv
from mistralai import Mistral
import base64

load_dotenv()

MISTRAL_EMBEDDING_MODEL = "mistral-embed"
websearch_agent = None
image_agent = None

mistral_client = Mistral(
    api_key=os.getenv("API_KEY")
)

def generate_embedding(text: str) -> list[float]:
    response = mistral_client.embeddings.create(
        model=MISTRAL_EMBEDDING_MODEL,
        inputs=[text]
    )
    
    embedding = response.data[0].embedding
    return embedding

def encode_pdf(pdf_path):
    """Encode the pdf to base64."""
    try:
        with open(pdf_path, "rb") as pdf_file:
            return base64.b64encode(pdf_file.read()).decode('utf-8')
    except FileNotFoundError:
        print(f"Error: The file {pdf_path} was not found.")
        return None
    except Exception as e:  # Added general exception handling
        print(f"Error: {e}")
        return None
    
def encode_image(image_path):
    """Encode the image to base64."""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except FileNotFoundError:
        print(f"Error: The file {image_path} was not found.")
        return None
    except Exception as e:  # Added general exception handling
        print(f"Error: {e}")
        return None

def ocr_pdf(document_path: str) -> dict:\

    if document_path.endswith(".pdf"):
        base64_pdf = encode_pdf(document_path)

        ocr_response = mistral_client.ocr.process(
            model="mistral-ocr-latest",
            document={
                "type": "document_url",
                "document_url": f"data:application/pdf;base64,{base64_pdf}" 
            },
            include_image_base64=True
        )

    elif document_path.endswith(".jpg") or document_path.endswith(".jpeg") or document_path.endswith(".png"):
        base64_image = encode_image(document_path)
        extension = document_path.split(".")[-1]

        ocr_response = mistral_client.ocr.process(
            model="mistral-ocr-latest",
            document={
                "type": "image_url",
                "image_url": f"data:image/{extension};base64,{base64_image}" 
            },
            include_image_base64=True
        )

    return ocr_response


def generate_and_download_image(prompt: str = "Generate an orange cat in an office.") -> dict:
    """Complete function to generate an image and download it immediately"""
    global image_agent

    try:
        # Create agent if it doesn't exist
        if image_agent is None:
            image_agent = mistral_client.beta.agents.create(
                model="mistral-medium-2505",
                name="Image Generation Agent",
                description="Agent used to generate images.",
                instructions="Use the image generation tool when you have to create images.",
                tools=[{"type": "image_generation"}],
                completion_args={
                    "temperature": 0.3,
                    "top_p": 0.95,
                }
            )

        # Start conversation to generate image
        response = mistral_client.beta.conversations.start(
            agent_id=image_agent.id,
            inputs=prompt
        )

        # Extract file_id from the response
        file_id = None
        file_name = None
        
        # Convert response to dict if it has a model_dump method
        if hasattr(response, 'model_dump'):
            response_dict = response.model_dump()
        else:
            response_dict = response
        
        for output in response_dict["outputs"]:
            if output["type"] == "message.output":
                for content_item in output["content"]:
                    if content_item["type"] == "tool_file":
                        file_id = content_item["file_id"]
                        file_name = content_item.get("file_name", "generated_image")
                        break
        
        if file_id:
            # Download using the file ID
            file_bytes = mistral_client.files.download(file_id=file_id).read()

            # Save the file locally
            local_filename = f"{file_name}.png"
            with open(local_filename, "wb") as file:
                file.write(file_bytes)
            
            print(f"Image successfully generated and saved as {local_filename}")
            return {
                "success": True, 
                "file_path": local_filename, 
                "file_id": file_id,
                "prompt": prompt
            }
        else:
            print("No image file found in response")
            return {"success": False, "error": "No image file found in response"}
            
    except Exception as e:
        print(f"Error in image generation and download: {e}")
        return {"success": False, "error": str(e)}

def create_image_agent():
    """Legacy function - use generate_and_download_image instead"""
    return generate_and_download_image()

def web_search_agent(query: str) -> dict:
    global websearch_agent

    if websearch_agent is None:
        websearch_agent = mistral_client.beta.agents.create(
            model="mistral-medium-2505",
            description="Agent able to search information over the web, such as news, weather, sport results...",
            name="Websearch Agent",
            instructions="You have the ability to perform web searches with `web_search` to find up-to-date information.",
            tools=[{"type": "web_search"}],
            completion_args={
                "temperature": 0.3,
                "top_p": 0.95,
            }
        )

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
    return md



def test_image_download(file_id: str):
    """Test function to download an image using a specific file_id"""
    try:
        # Download using the file ID
        file_bytes = mistral_client.files.download(file_id=file_id).read()

        # Save the file locally
        filename = f"downloaded_image_{file_id[:8]}.png"
        with open(filename, "wb") as file:
            file.write(file_bytes)
        
        print(f"Image successfully downloaded and saved as {filename}")
        return {"success": True, "file_path": filename, "file_id": file_id}
    except Exception as e:
        print(f"Error downloading image: {e}")
        return {"success": False, "error": str(e)}

def test_mistral_tools():
    print("Testing web search agent:")
    print(web_search_agent("Who won the last European Football cup?"))
    
    print("\nTesting OCR:")
    print(ocr_pdf("src/tools/test.pdf"))
    
    print("\nTesting embedding generation:")
    print(generate_embedding("Hello, world!"))
    
    print("\nTesting image generation and download:")
    result = generate_and_download_image("A cute orange cat sitting in a modern office")
    print(result)

if __name__ == "__main__":
    test_mistral_tools()