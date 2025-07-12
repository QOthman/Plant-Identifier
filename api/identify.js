export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { base64Image } = req.body;

  try {
    const response = await fetch("https://plant.id/api/v3/identification?details=common_names,url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": process.env.PLANT_ID_API_KEY
      },
      body: JSON.stringify({
        images: [`data:image/jpg;base64,${base64Image}`],
        similar_images: true
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Identification failed." });
  }
}
