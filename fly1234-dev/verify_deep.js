const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";
const endpoint = "https://accounts.fly4all.com/api/finance/buyers";
const token = "1cdtzai1n5ksohsq83rogqb56970de4f7e55ed8767115";

async function probeStart(start) {
    try {
        const response = await fetch(FN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                endpoint,
                token,
                method: "POST",
                params: {
                    "pagination[start]": start,
                    "pagination[limit]": 10
                },
                body: {}
            })
        });
        const result = await response.json();
        if (result.ok) {
            const data = result.data;
            const items = data.data || [];
            console.log(`Offset ${start}: OK. Returned ${items.length} items. Total: ${data.total}`);
            if (items.length > 0) {
                console.log(`First item at offset ${start} ID: ${items[0].id}`);
            }
        } else {
            console.log(`Offset ${start} FAILED: ${result.error}`);
        }
    } catch (err) { console.log(`Offset ${start} EXCEPTION: ${err.message}`); }
}

async function run() {
    console.log("Verifying Beyond-4600 Access...");
    await probeStart(4000); // Should be OK
    await probeStart(5000); // Was failing before (as page 500)
    await probeStart(10000); // Way beyond
}

run();
