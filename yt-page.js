const url = 'https://www.googleapis.com/youtube/v3/videos?part=statistics';
const videoLinkRegex = /\/watch\?v=(.*)&?.*/;

const videoListSelectors = [
  "ytd-rich-grid-renderer > #contents",
  "ytd-watch-next-secondary-results-renderer > #items",
  "ytd-item-section-renderer > #contents"
];
const videoItemSelectors = [
  "ytd-rich-item-renderer",
  "ytd-compact-video-renderer",
  "ytd-video-renderer"
];
const skeletonSelector = "#related-skeleton video-skeleton";
const viewsSelector = "ytd-video-meta-block #metadata-line span.ytd-video-meta-block:first-child";

var siteHasUpdated = false;
var apiKey = "INSERT_API_KEY";

// When the page is updated, we are alerted by the background
// script and will check for video lists
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  videoListSelectors.forEach(selector => {
    const $listContainer = $(selector);
    if (elementExists($listContainer)) {
      siteHasUpdated = true;
      observer.observe($listContainer.get(0), observerAttr);
    }
  });
  sendResponse({});
  return true;
});

// Handles new videos that pop up from scrolling down the page
const observerAttr = { childList: true, attributes: true };
MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
var observer = new MutationObserver(function (mutations, observer) {
  siteHasUpdated = true;
});

// Wait for video skeletons to disappear which means the video
// list has been fully loaded.
const checkForLoadInterval = setInterval(() => {
  if (siteHasUpdated && !elementExists($(skeletonSelector))) {
    siteHasUpdated = false;
    setLikeRatios();
  }
}, 1000);

// Set like ratios for all videos on the page
async function setLikeRatios() {
  const $itemLists = videoItemSelectors.map(selector => $(selector))
    .filter($itemList => elementExists($itemList));
  for (const $itemList of $itemLists) {
    for (const item of $itemList) {
      await setLikeRatio($(item));
    }
  }
}

// Set the like ratio of a single video item
async function setLikeRatio($item) {
  const videoLink = $item.find("a#thumbnail").attr("href");
  const videoIdMatch = videoLinkRegex.exec(videoLink);
  let likeRatio, likeCount, dislikeCount;

  if (videoIdMatch && videoIdMatch[1]) {
    const videoId = videoIdMatch[1];
    const params = `&id=${videoId}&key=${apiKey}`;

    // If there already is a likeRatio on the video and the ID matches
    // the video, then exit.
    let $likeRatioDisplay = $item.find("#likeRatio");
    if (elementExists($likeRatioDisplay)) {
      if ($likeRatioDisplay.attr("data-video-id") === videoId) {
        return;
      } else {
        $likeRatioDisplay.remove();
      }
    }
    // Add the likeRatio span to signal that the likeRatio is being
    // fetched.
    $item.find(viewsSelector)
      .after(`<span id="likeRatio" class="style-scope ytd-video-meta-block"
        title="Fetching likes." data-video-id="${videoId}">...</span>`);
    
    const data = await makeRequest(url + params);
    if (data && data.items && data.items[0] && data.items[0].statistics) {
      const stats = data.items[0].statistics;
      likeCount = parseInt(stats.likeCount);
      dislikeCount = parseInt(stats.dislikeCount);
      likeRatio = parseInt(likeCount / (likeCount + dislikeCount) * 100);
    }
  }
  if (likeRatio && likeRatio !== NaN) {
    let $likeRatioDisplay = $item.find("#likeRatio");
    // Populate the likeRatio span
    $likeRatioDisplay.attr("title",
      `Likes: ${likeCount}, Dislikes: ${dislikeCount}, Video ID: ${videoIdMatch[1]}`);
    $likeRatioDisplay.text(`${likeRatio}% liked`);
  }
}

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    $.getJSON(url, data => resolve(data));
  });
}

function elementExists($element) {
  return $element.length;
}