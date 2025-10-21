// ==UserScript==
// @name     SuperPixiv
// @version  14
// @match    https://www.pixiv.net/*
// @match    https://www.instagram.com/*
// @updateURL https://github.com/Tina-otoge/SuperPixiv/raw/master/super-pixiv.user.js
// ==/UserScript==

const PROXY_URL = 'https://pixiv.ducks.party';

// Platform detection
const PLATFORM = window.location.hostname.includes('instagram.com') ? 'instagram' : 'pixiv';

// Instagram API helper
async function fetchInstagramPost(shortcode) {
  const url = `https://www.instagram.com/graphql/query/?query_hash=477b65a610463740ccdb83135b2014db&variables=${encodeURIComponent(JSON.stringify({
    shortcode: shortcode,
    child_comment_count: 0,
    fetch_comment_count: 0,
    parent_comment_count: 0,
    has_threaded_comments: false
  }))}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-ig-app-id': '936619743392459'
      }
    });
    const data = await response.json();
    return data.data.shortcode_media;
  } catch (e) {
    console.error('Failed to fetch Instagram post:', e);
    return null;
  }
}

async function insert_viewer(id) {
  const viewer = document.createElement("div");
  viewer.style.cssText = `
    height: 100vh;
    width: calc(100vw - 200px);
    position: fixed;
    top: 0;
    left: 100px;
    background: rgba(0,0,0,.8);
    display: flex;
    flex-direction: column;
    padding-top: 60px;
    overflow: scroll;
    cursor: zoom-out;
  `;

  document.body.appendChild(viewer);
  document.body.style.overflow = 'hidden';
    

  viewer.onclick = () => {
    document.body.removeChild(viewer);
    document.body.style.overflow = 'initial';
  };

  async function load_data_pixiv() {
    let meta = await fetch(`https://www.pixiv.net/ajax/illust/${id}?lang=en`);
    meta = await meta.json();
    meta = meta.body;
    console.log(meta);
    const tags = [];
    meta.tags.tags.forEach(tag => {
      if (tag.translation)
        tags.push(tag.translation.en);
      else if (tag.romaji)
        tags.push(tag.romaji);
      else
        tags.push(tag.tag);
    });
    const meta_tag = document.createElement('div');
    meta_tag.innerHTML = `
			<p>${meta.illustTitle} by ${meta.userName} on ${meta.createDate}</p>
			<p>${tags.join(", ")}</p>
			<p>View: ${meta.viewCount} | Bookmarks: ${meta.bookmarkCount} | Comments: ${meta.commentCount} | Pages: ${meta.pageCount}</p>
		`;
    if (meta.aiType == 2) {
      meta_tag.innerHTML += `
      	<p style="color: red; font-weight: bold">AI Generated</p>
    	`
    }
    meta_tag.style.cssText = `
      text-align: center;
      color: white;
      text-shadow: 1px 1px 2px black;
      line-height: 1.5;
      width: 100%;
      position: fixed;
      top: 0;
    `;
    viewer.appendChild(meta_tag);

    if (meta.illustType == 2) {
      const video = document.createElement("video");
      const id = meta.illustId;
      const prefix = "0" + id.slice(0, 3);
      // video.src = `https://i.ugoira.com/mp4/${prefix}/${id}.mp4`;
	  video.src = `https://t-hk.ugoira.com/ugoira/${id}.mp4`;
      video.autoplay = true;
      video.controls = true;
      video.loop = true;
      video.style.cssText = `
      	max-width: calc(100% - 100px);
        max-height: calc(90% - 200px);
        margin: 0;
        position: relative;
        left: 50px;
        cursor: default;
      `;
      viewer.appendChild(video);
    } else {
      let pages = await fetch(`https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`);
      pages = await pages.json();
      pages = pages.body;
      pages.forEach(o => {
        const img = document.createElement("img");
        img.src = o.urls.regular;
        img.style.cssText = `
          margin: 1rem auto;
          max-width: 90%;
          max-height: calc(100vh - 100px);
        `;
        viewer.appendChild(img);
      });
    }
  }

  async function load_data_instagram() {
    const media = await fetchInstagramPost(id);
    if (!media) {
      viewer.innerHTML = '<p style="color: white; text-align: center; margin-top: 50px;">Failed to load Instagram post</p>';
      return;
    }

    console.log(media);

    // Create metadata section
    const meta_tag = document.createElement('div');
    const caption = media.edge_media_to_caption.edges[0]?.node.text || '';
    const captionPreview = caption.length > 100 ? caption.substring(0, 100) + '...' : caption;

    meta_tag.innerHTML = `
      <p>by @${media.owner.username}</p>
      <p>${captionPreview}</p>
      <p>Likes: ${media.edge_media_preview_like.count} | Comments: ${media.edge_media_to_comment.count}</p>
    `;
    meta_tag.style.cssText = `
      text-align: center;
      color: white;
      text-shadow: 1px 1px 2px black;
      line-height: 1.5;
      width: 100%;
      position: fixed;
      top: 0;
    `;
    viewer.appendChild(meta_tag);

    // Handle different media types
    if (media.__typename === 'GraphVideo' || media.is_video) {
      // Single video
      const video = document.createElement("video");
      video.src = media.video_url;
      video.autoplay = true;
      video.controls = true;
      video.loop = true;
      video.style.cssText = `
        max-width: calc(100% - 100px);
        max-height: calc(90% - 200px);
        margin: 0 auto;
        display: block;
        cursor: default;
      `;
      viewer.appendChild(video);
    } else if (media.__typename === 'GraphSidecar') {
      // Carousel (multiple images/videos)
      media.edge_sidecar_to_children.edges.forEach(edge => {
        const item = edge.node;
        if (item.is_video) {
          const video = document.createElement("video");
          video.src = item.video_url;
          video.controls = true;
          video.loop = true;
          video.style.cssText = `
            margin: 1rem auto;
            max-width: 90%;
            max-height: calc(100vh - 100px);
            display: block;
          `;
          viewer.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.src = item.display_url;
          img.style.cssText = `
            margin: 1rem auto;
            max-width: 90%;
            max-height: calc(100vh - 100px);
            display: block;
          `;
          viewer.appendChild(img);
        }
      });
    } else {
      // Single image
      const img = document.createElement("img");
      img.src = media.display_url;
      img.style.cssText = `
        margin: 1rem auto;
        max-width: 90%;
        max-height: calc(100vh - 100px);
        display: block;
      `;
      viewer.appendChild(img);
    }
  }

  // Load data based on platform
  if (PLATFORM === 'instagram') {
    load_data_instagram();
  } else {
    load_data_pixiv();
  }
}

function _detect_and_attach_pixiv(doc) {
  doc.querySelectorAll('[data-gtm-value], .relative a').forEach(illust => {
    if (illust.dataset.viewer)
      return;
    illust.dataset.viewer = true;
    if (illust.getAttribute('data-gtm-context'))
        return;
    const container = illust.parentElement;
//  causes viewer to not work on artist pages, disabling until I figure out why I added this check
//     if (container.children.length != 3)
//       return;
    container.style.position = 'relative';
    const link = illust.tagName == "a" ? illust : container.querySelector('a');
    if (!link)
      return;
    if (!link.href.includes("/artworks/"))
      return;
    let id = link.getAttribute('data-gtm-value');
    if (!id) {
      id =  link.href.split("/")[4];
    }
    const button = document.createElement('div');
    button.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 60%;
      cursor: zoom-in;
		`;
    container.appendChild(button);
    button.onclick = (e) => {
      insert_viewer(id);
    };
  });
}

function _detect_and_attach_instagram(doc) {
  // Find all Instagram post links
  doc.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]').forEach(link => {
    if (link.dataset.viewer)
      return;
    link.dataset.viewer = true;

    // Extract shortcode from URL
    const match = link.href.match(/\/(p|reel)\/([^\/]+)/);
    if (!match)
      return;

    const shortcode = match[2];

    // Find the closest article or image container
    let container = link.closest('article');
    if (!container) {
      // Try to find image container
      const img = link.querySelector('img');
      if (img) {
        container = link;
      } else {
        return;
      }
    }

    // Check if we already added a button to this container
    if (container.dataset.viewerAttached)
      return;
    container.dataset.viewerAttached = true;

    // Make container position relative for absolute positioning
    container.style.position = 'relative';

    // Create invisible overlay button
    const button = document.createElement('div');
    button.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 60%;
      cursor: zoom-in;
      z-index: 10;
    `;
    container.appendChild(button);
    button.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      insert_viewer(shortcode);
    };
  });
}

function detect_and_attach() {
  if (PLATFORM === 'instagram') {
    _detect_and_attach_instagram(document);
  } else {
    _detect_and_attach_pixiv(document);
    for (const el of document.querySelectorAll("pixiv-infinite-scroll"))
      _detect_and_attach_pixiv(el.shadowRoot);
  }
}

function setup_proxy() {
  // Proxy is only for Pixiv
  if (PLATFORM !== 'pixiv')
    return;

  const ORIGINAL_URL = 'https://i.pximg.net';
  document.querySelectorAll('img').forEach(img => {
    if (!img.src.startsWith(ORIGINAL_URL))
      return;
    console.log(`Replacing ${img.src} -> ${PROXY_URL}`);
    img.src = PROXY_URL + img.src.slice(ORIGINAL_URL.length);
  });
}

setInterval(detect_and_attach, 500);
setInterval(setup_proxy, 500);
