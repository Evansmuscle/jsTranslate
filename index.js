const fs = require("fs");
const puppeteer = require("puppeteer");

const dataPath = "./data/";
const outputPath = "./output/";

const translateFrom = "en";
const translateTo = "de";

(async () => {
  const browser = await puppeteer.launch();

  const getTranslationLink = (from, to, content) => {
    const encodedContent = encodeURI(content);
    const translationLink = `https://www.deepl.com/translator#${from}/${to}/${encodedContent}`;

    return translationLink;
  };

  const translate = async (from = "en", to = "de", content) => {
    let translation = "";
    const page = await browser.newPage();

    try {
      const link = getTranslationLink(from, to, content);
      await page.goto(link, {
        waitUntil: ["networkidle0", "domcontentloaded", "load"],
      });

      await page.waitForSelector("#target-dummydiv");
      const element = await page.$("#target-dummydiv");
      translation = await page.evaluate((el) => el.textContent, element);
    } catch (err) {
      console.log(err);
    }

    return translation;
  };

  const readJSON = () => {
    const objToTranslate = {};

    // Get all file path names
    const filePaths = fs.readdirSync(dataPath).map((path) => dataPath + path);

    // Get all file content
    filePaths.forEach((path) => {
      const fileNameArr = path.split("/");
      const fileName = fileNameArr[fileNameArr.length - 1];

      const fileContent = fs.readFileSync(path).toString();
      const parsedObj = JSON.parse(fileContent);

      objToTranslate[`${fileName}`] = parsedObj;
    });

    return objToTranslate;
  };

  const outputJSON = (fileName, objTranslated) => {
    const translatedFilePath = outputPath + fileName;
    fs.writeFileSync(translatedFilePath, JSON.stringify(objTranslated));
  };

  const loopOverJSON = async (
    translationObj,
    objTranslated,
    fullObj,
    fileName
  ) => {
    Object.entries(translationObj).forEach(async ([key, val]) => {
      if (typeof val === "string") {
        const translation = await (
          await translate(translateFrom, translateTo, val)
        ).trimEnd();
        objTranslated[key] = translation;

        if (fileName) {
          outputJSON(fileName, objTranslated);
        }
      } else {
        objTranslated[key] = val;
        loopOverJSON(val, objTranslated[key], fullObj);
      }
    });
  };

  const translateJSON = () => {
    const objToTranslate = readJSON();
    Object.keys(objToTranslate).forEach(async (key) => {
      const translationObj = objToTranslate[key];
      const objTranslated = {};

      await loopOverJSON(translationObj, objTranslated, objTranslated, key);
    });

    // browser.close();
  };

  const init = async () => {
    const [dataExists, outputExists] = [
      fs.existsSync(dataPath),
      fs.existsSync(outputPath),
    ];

    if (!dataExists) {
      fs.mkdirSync(dataPath);
    }

    if (!outputExists) {
      fs.mkdirSync(outputPath);
    }

    translateJSON();
  };

  init();
})();
