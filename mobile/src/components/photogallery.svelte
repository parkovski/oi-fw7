<script>
  import { onMount } from 'svelte';
  export let urls;
  export let targetSize = 150;

  let imageContainer;
  let popup;

  function setSize(img, width, height) {
    if (img.naturalWidth / width > img.naturalHeight / height) {
      img.width = width;
      img.height = img.naturalHeight * width / img.naturalWidth;
    } else {
      img.height = height;
      img.width = img.naturalWidth * height / img.naturalHeight;
    }
  }

  onMount(() => {
    urls.forEach(url => {
      const div = document.createElement('div');
      const img = document.createElement('img');
      img.src = url;
      img.onload = function() {
        setSize(img, targetSize, targetSize);
      };
      img.onclick = function() {
        if (popup.children.length) {
          popup.removeChild(popup.children[0]);
          return;
        }
        const img = document.createElement('img');
        img.src = url;
        img.onload = function() {
          popup.style.display = 'block';
          const width = document.documentElement.clientWidth - 32;
          const height = document.documentElement.clientHeight - 256;
          setSize(img, width, height);
          popup.style.left = `${(document.documentElement.clientWidth - img.width) / 2 - 8}px`;
          popup.style.top = `${(document.documentElement.clientHeight - img.height) / 2 - 8}px`;
        };
        popup.appendChild(img);
      }
      div.appendChild(img);
      imageContainer.appendChild(div);
    });

    popup.onclick = function() {
      if (popup.children.length) {
        popup.removeChild(popup.children[0]);
      }
      popup.style.display = 'none';
    }
  });
</script>

<style>
  :global(#image-container div) {
    display: inline-block;
    margin: 4px;
    width: 150px;
    height: 150px;
    text-align: center;
    vertical-align: middle;
    cursor: pointer;
  }

  #popup {
    position: fixed;
    padding: 8px;
    background: #606060e0;
    border-radius: 5px;
  }
</style>

<div id="image-container" bind:this={imageContainer}>
</div>
<div id="popup" style="display: none" bind:this={popup}></div>
