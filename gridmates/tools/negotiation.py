
from langchain_core.tools import tool


MAX_ROUNDS = 3
BUYER_MAX_PRICE = 0.25
SELLER_MIN_PRICE = 0.10
QUANTITY_KWH = 3


@tool
def negotiate_electricity() -> str:
    """Run a three-round electricity negotiation between the buyer and seller.

    Use this tool when the user wants to start or continue an electricity
    negotiation. Returns the round-by-round result.
    """
    history = []

    for round_number in range(1, MAX_ROUNDS + 1):
        history_text = "\n\n".join(history) or "No previous offers."

        # This version asks the supervisor to coordinate each round.
        # The next step will make the two party calls explicit and verifiable.
        request = f"""
Conduct negotiation round {round_number} of {MAX_ROUNDS}.

Follow the rules in your instructions.md.

Ask BOTH the buyer and seller subagents for their current proposals.
Use this previous negotiation history:
{history_text}

Buyer maximum: €{BUYER_MAX_PRICE:.2f}/kWh.
Seller minimum: €{SELLER_MIN_PRICE:.2f}/kWh.
Quantity required: {QUANTITY_KWH} kWh.

Return both parties' actual proposals and whether both explicitly
accept the same price and quantity. Do not invent responses.

If both parties explicitly accept a price within the limits, state:
AGREEMENT REACHED
Agreed price: <price>
Quantity: {QUANTITY_KWH} kWh
Total cost: <price multiplied by {QUANTITY_KWH}>

Otherwise, state:
NO AGREEMENT YET
"""

        # This tool does not have access to the supervisor's runtime.
        # Return the round request for the supervisor to process.
        history.append(
            f"Round {round_number} request:\n{request.strip()}"
        )

    return (
        "Negotiation round plan created for 3 rounds.\n\n"
        + "\n\n".join(history)
        + "\n\nImportant: this version creates the round plan but does not "
        "execute subagents. We will connect the execution logic next."
    )
