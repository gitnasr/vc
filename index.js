require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const B2 = require("backblaze-b2");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve index.html

app.post("/upload", async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const fileName = decodeURIComponent(path.basename(new URL(url).pathname));
    await b2.authorize();

    const fileRes = await axios.get(url, { responseType: "arraybuffer" });
    const fileData = Buffer.from(fileRes.data);

    const { data: uploadData } = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID,
    });

    await b2.uploadFile({
      uploadUrl: uploadData.uploadUrl,
      uploadAuthToken: uploadData.authorizationToken,
      fileName,
      data: fileData,
      contentType:
        fileRes.headers["content-type"] || "application/octet-stream",
    });

    const link = `https://f003.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}`;
    res.json({ link });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 UI running at http://localhost:${PORT}`)
);
