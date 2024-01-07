<script>
  import Select from 'svelte-select';
  import { onMount } from 'svelte';

  export let items;
  export let value;
  export let searchable;
  export let multiple;
  export let placeholder;

  const htmlElement = document.querySelector('html');
  let isDarkMode = htmlElement.classList.contains('dark');

  onMount(() => {
    const observer = new MutationObserver(list => {
      for (let mutation of list) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          isDarkMode = mutation.target.classList.contains('dark');
        }
      }
    });
    observer.observe(htmlElement, { attributes: true });

    return () => observer.disconnect();
  });
</script>

<Select {items} {searchable} {multiple} {placeholder}
  class="select-f7-colors" bind:value
  --list-background="var(--f7-text-editor-bg-color)"
  --item-color="var(--f7-text-color)"
  --item-hover-bg="#888"
  --multi-item-bg={isDarkMode ? "#282828" : undefined}
  --multi-item-clear-icon-color={isDarkMode ? "white" : undefined}
  --multi-item-outline={isDarkMode ? "1px solid #444" : undefined}
  --border={isDarkMode ? "1px solid #444" : undefined}
/>
