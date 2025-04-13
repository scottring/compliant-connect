✅ TEST SCRIPT: PIR Request / Respond / Review Flow

⸻

🎯 Goal

Verify that a product information request can be:
1. Sent from Customer A to Supplier B
2. Completed by Supplier B
3. Reviewed by Customer A

⸻

👤 Actors
• Customer A (request initiator)
• Supplier B (responder)

⸻

🧪 STEP-BY-STEP TEST CASE

⸻

🔹 1. Create the Product Sheet
• Log in as Customer A
• Navigate to “Product Sheets” → “Our Products”
• Click “New Product”
• Fill in:
• Product name: Test Widget
• Category: Electronics
• Save the sheet

⸻

🔹 2. Send a Product Info Request
• From the Test Widget sheet, click “Request Info”
• Select Supplier B from the dropdown
• Choose a question template or tag (e.g., Materials Compliance)
• Confirm and send request
• Verify:
• Request status = “Sent”
• Appears under “Outgoing Requests” list

⸻

🔹 3. Respond as Supplier
• Log in as Supplier B
• Navigate to “Incoming Requests”
• Click the Test Widget request
• Review the questions
• Fill out:
• Component breakdown
• Materials list
• Upload any required documents
• Submit response
• Confirm status = “Submitted”
• Email or notification sent to Customer A

⸻

🔹 4. Review the Response
• Log back in as Customer A
• Open “Incoming Responses” → Test Widget
• View supplier responses
• Test “flag” functionality (flag a questionable answer)
• Add comments or follow-ups
• Approve the response

⸻

✅ Final Checks
• Info request appears in completed history
• Product sheet now shows updated data
• All actions are logged (audit trail)

⸻

📋 Notes:
• Optional: Include rejection flow test (Customer rejects and sends back)
• Optional: Include resubmit flow (Supplier updates and re-submits)