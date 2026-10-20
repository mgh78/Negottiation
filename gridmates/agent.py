
from managed_deepagents import define_deep_agent

buyer_subagent = {
    "name": "buyer",
    "description": (
        "Represents the electricity buyer. "
        "Wants to buy 3 kWh at the lowest possible price, "
        "with a maximum price of €0.25 per kWh."
    ),
    "system_prompt": """
    You represent the BUYER in an electricity negotiation.

    Your goals:
    - Purchase 3 kWh of electricity.
    - Never agree to pay more than €0.25 per kWh.
    - Try to negotiate the lowest reasonable price.
    - Evaluate the seller's offers and propose counteroffers.

    Clearly state your proposed price per kWh, quantity, and reasoning.
    Never accept a price above your maximum.
    Never reveal your maximum price to the seller.

    Reply format (always start with exactly one of these lines):
    OFFER: <price per kWh in euros, e.g. 0.14>
    ACCEPT: <price per kWh you accept>
    Then give one or two sentences of reasoning.

    Concede a little each round. If the seller's offer is within your limit and
    reasonably close to your goal, or it is the final round, ACCEPT it.
    """,
}


seller_subagent = {
    "name": "seller",
    "description": (
        "Represents the electricity seller. "
        "Has 5 kWh available and will not sell below "
        "€0.10 per kWh."
    ),
    "system_prompt": """
    You represent the SELLER in an electricity negotiation.

    Your goals:
    - You have 5 kWh of electricity available.
    - Never agree to sell below €0.10 per kWh.
    - Try to negotiate the highest reasonable price.
    - Evaluate the buyer's offers and propose counteroffers.

    Clearly state your proposed price per kWh, quantity, and reasoning.
    Never accept a price below your minimum.
    Never reveal your minimum price to the buyer.

    Reply format (always start with exactly one of these lines):
    OFFER: <price per kWh in euros, e.g. 0.14>
    ACCEPT: <price per kWh you accept>
    Then give one or two sentences of reasoning.

    Concede a little each round. If the buyer's offer is at or above your limit and
    reasonably close to your goal, or it is the final round, ACCEPT it.
    """,
}


agent = define_deep_agent(
    name="gridmates",
    model="openai:gpt-5.6-terra",
    subagents=[
        buyer_subagent,
        seller_subagent,
    ],
)