const puppeteer = require("puppeteer");
var promiseMap = require("bluebird").map;
const { createObjectCsvWriter } = require("csv-writer");
const csvfilepath = __dirname + "/message.csv";
const csvWriter = createObjectCsvWriter({
  path: csvfilepath,
  header: [
    // {id: 'name', title: 'NAME'},      //Headerつける場合
    // {id: 'lang', title: 'LANGUAGE'}　 //Headerつける場合
    "user",
    "url",
    "contribution"
  ],
  encoding: "utf8",
  append: false // append : no header if true
});

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

async function getUserContributions(browser, url) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  const contribution = await page.evaluate(selector => {
    const stat = document.querySelectorAll(selector)[1];
    const contribution = stat ? stat.innerText : 0;
    return contribution;
  }, ".userActivityChart_statCount");
  console.log(`fetch: ${url}, contribution: ${contribution}`);
  await page.close();
  return contribution;
}

async function getUsers(browser, pageNo) {
  const page = await browser.newPage();
  await page.goto(`https://qiita.com/users?page=${pageNo}`);
  // Get the "viewport" of the page, as reported by the page.
  const users = await page.evaluate(() => {
    const docs = document.querySelectorAll(".UsersPage__user");
    // return docs[1].innerText.split("\n")[0];
    const arr = [];
    for (let item of docs) {
      arr.push(item.innerText.split("\n")[0]);
    }
    return arr;
  });
  await page.close();
  return users;
}

const main = async () => {
  const browser = await puppeteer.launch({ headless: true });

  for (let i = 1; i <= 336; i++) {
    await loop(browser, i);
  }

  await browser.close();
};

// module.exports = main;

main();
async function loop(browser, pageNo) {
  const users = await getUsers(browser, pageNo);
  //   const users = ["a_fujita", "A_Fukuda"];
  //   const promises = users.map(user =>
  //     getUserContributions(browser, "https://qiita.com/" + user)
  //   );
  //   let contributions = [];
  //   for (const user of users) {
  //     const contribution = await getUserContributions(
  //       browser,
  //       "https://qiita.com/" + user
  //     );
  //     contributions.push(contribution);
  //   }
  const contributions = await promiseMap(
    users,
    user => getUserContributions(browser, "https://qiita.com/" + user),
    { concurrency: 10 }
  );
  //   console.log(promises.length);
  result = [];
  //   const contributions = await Promise.all(promises, { concurrency: 2 });
  contributions.forEach((item, index) => {
    result[index] = {
      user: users[index],
      url: "https://qiita.com/" + users[index],
      contribution: item
    };
  });
  csvWriter
    .writeRecords(result) // returns a promise
    .then(() => {
      console.log("...Done");
    });
}
