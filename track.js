import axios from "axios";
import pMap from "p-map";

const token = "";

const owner = "";

const repo = "";

const pr_state = "all";

let date = new Date();
date.setDate(date.getDate() - 30);

date = date.valueOf();

const track = async () => {
  let list = [];

  let page = 1;

  while (true) {
    await new Promise((res) => setTimeout(res, 1000 * 0.1));
    const pullRes = await axios({
      url: `https://api.github.com/repos/${owner}/${repo}/pulls?state=${pr_state}&page=${page}&per_page=100`,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      method: "GET",
    }).catch((e) => console.error(e));

    if (
      !pullRes ||
      !(pullRes.data && Array.isArray(pullRes.data) && pullRes.data.length)
    ) {
      break;
    }

    list.push(...pullRes.data);
    page++;
  }

  const approveMap = {};

  const commentMap = {};

  await pMap(
    list,
    async (pr) => {
      await new Promise((res) => setTimeout(res, 1000 * 0.1));

      if (!pr) return;

      const reviewRes = await axios({
        url: `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/reviews`,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        method: "GET",
      });

      if (
        !reviewRes ||
        !(
          reviewRes.data &&
          Array.isArray(reviewRes.data) &&
          reviewRes.data.length
        )
      ) {
        return;
      }

      reviewRes.data
        .filter(
          ({ submitted_at: submittedAt }) =>
            new Date(submittedAt).valueOf() >= date
        )
        .forEach(({ user, state }) => {
          const { login } = user;

          if (approveMap[login] === undefined) {
            approveMap[login] = 0;
          }

          if (commentMap[login] === undefined) {
            commentMap[login] = 0;
          }

          switch (state) {
            case "COMMENTED":
              commentMap[login] += 1;
              break;
            case "APPROVED":
              approveMap[login] += 1;
              break;
            default:
              break;
          }
        });
    },
    { stopOnError: true, concurrency: 20 }
  ).catch((e) => console.log(e));

  for (let i = 0; i <= list.length; i++) {}

  console.log(`Number of Prs: ${list.length}`);

  console.log("\nApproval Totals");

  Object.keys(approveMap)
    .map((user) => [user, approveMap[user]])
    .sort(([, a], [, b]) => b - a)
    .forEach(([user, number]) => console.log(user, number));

  console.log("\nComment Totals");
  Object.keys(commentMap)
    .map((user) => [user, commentMap[user]])
    .sort(([, a], [, b]) => b - a)
    .forEach(([user, number]) => console.log(user, number));
};

track();
