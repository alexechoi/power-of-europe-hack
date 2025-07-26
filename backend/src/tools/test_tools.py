import asyncio

# Example async tools
async def get_weather(city: str) -> str:
    """Get the current weather for a city"""
    await asyncio.sleep(1)  # Simulate async API call delay
    # Simulate weather data
    weather_data = {
        "New York": "sunny and 72°F",
        "London": "cloudy and 59°F", 
        "Tokyo": "rainy and 65°F",
        "Sydney": "windy and 70°F"
    }
    return f"The weather in {city} is {weather_data.get(city, 'unknown - data not available')}"

async def calculate(expression: str) -> str:
    """Safely evaluate a mathematical expression"""
    await asyncio.sleep(0.5)  # Simulate async processing time
    try:
        # Simple calculator - in production, use a proper math parser
        result = eval(expression.replace("^", "**"))
        return str(result)
    except:
        return "Invalid mathematical expression"


async def get_time(timezone: str = "UTC") -> str:
    """Get the current time in a specific timezone"""
    await asyncio.sleep(0.3)  # Simulate async API call
    
    # Simple timezone simulation
    timezone_offsets = {
        "UTC": 0, "EST": -5, "PST": -8, "GMT": 0, 
        "JST": 9, "AEST": 10
    }
    
    if timezone in timezone_offsets:
        return f"Current time in {timezone}: 12:30 PM (simulated)"
    else:
        return f"Unknown timezone: {timezone}"


async def search_web(query: str) -> str:
    """Search the web for information"""
    await asyncio.sleep(1.5)  # Simulate async web search delay
    
    # Simulate search results
    results = {
        "python": "Python is a high-level programming language...",
        "weather": "Weather information can be found on weather.com...",
        "news": "Latest news updates available on news websites...",
    }
    
    for keyword in results:
        if keyword.lower() in query.lower():
            return f"Search results for '{query}': {results[keyword]}"
    
    return f"Search results for '{query}': No specific results found"


async def get_stock_price(symbol: str) -> str:
    """Get the current stock price for a symbol"""
    await asyncio.sleep(0.8)  # Simulate async API delay
    
    # Simulate stock data
    stocks = {
        "AAPL": "$150.25 (+2.1%)",
        "GOOGL": "$2,245.80 (-0.5%)", 
        "MSFT": "$305.15 (+1.2%)",
        "TSLA": "$195.40 (+3.8%)"
    }
    
    return f"{symbol}: {stocks.get(symbol.upper(), 'Symbol not found')}"