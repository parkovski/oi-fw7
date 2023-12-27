<script>
  import { Block, TextEditor } from 'framework7-svelte';
  import { onMount, afterUpdate } from 'svelte';
  import escapeHtml from '../js/escapehtml';

  export let chats = [];
  export let aggregate = [];
  export let pendingChats;
  export let onSend;

  let chat;
  let textEditor;
  let isScrolledToBottom = true;

  onMount(() => {
    textEditor.instance().contentEl.addEventListener('keydown', function(e) {
      if (e.composing || e.keyCode === 229) {
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const instance = textEditor.instance();
        let text = instance.value;
        if (text.endsWith('<br>')) {
          // ^^ Firefox does this so delete the trailing <br>.
          text = text.substring(0, text.length - 4);
        }
        if (text === '') {
          return;
        }
        onSend(text);
        instance.value = '';
        instance.contentEl.innerHTML = '';
      }
    });

    chat.addEventListener('scroll', () => {
      isScrolledToBottom = chat.clientHeight + chat.scrollTop === chat.scrollHeight;
    })
  });

  afterUpdate(() => {
    if (isScrolledToBottom) {
      chat.scrollTop = chat.scrollHeight;
    }
  });
</script>

<style>
  p.chatbubble {
    clear: both;
    max-width: 50%;
    display: inline-block;
    padding: 8px;
    border-radius: 8px;
    margin: 1em 0 0 0;
  }

  p.chatbubble:first-child {
    margin-top: 1em;
  }

  .chat-left {
    float: left;
    background: lightgrey;
  }

  :global(.dark) .chat-left {
    background: #444;
  }

  .chat-right {
    float: right;
    text-align: right;
    background: var(--f7-theme-color);
    color: var(--f7-button-fill-text-color, #fff);
  }

  .chat-left + .chat-left, .chat-right + .chat-right {
    margin-top: .25em;
  }

  .chat-from {
    clear: left;
    margin: 0;
    font-size: 85%;
  }

  .container {
    display: flex;
    flex-flow: column;
    height: 100%;
  }

  .chat {
    flex: 1 1 auto;
    overflow-y: scroll;
    padding: 0 var(--f7-block-padding-horizontal);
  }

  .editor {
    flex: 0 1 auto;
  }
</style>

<div class="container">
  <div bind:this={chat} class="chat">
    {#each aggregate as agg (agg.id)}
      {#each agg.chats as chat (chat.id)}
        {#if chat.from}
          <p class="chatbubble chat-left">{@html chat.text}</p>
        {:else}
          <p class="chatbubble chat-right">{@html chat.text}</p>
        {/if}
      {/each}
      {#if agg.chats[0].from}
        <p class="float-left chat-from">{agg.chats[0].fromName}</p>
      {/if}
    {/each}
    {#each chats as chat (chat.id)}
      {#if chat.from}
        <p class="chatbubble chat-left">{@html chat.text}</p>
      {:else}
        <p class="chatbubble chat-right">{@html chat.text}</p>
      {/if}
    {/each}
    {#each pendingChats as chat (chat.uuid)}
      <p class="chatbubble chat-right chat-pending">{@html escapeHtml(chat.text)}</p>
    {/each}
    <div style="clear:both"></div>
  </div>
  <div class="editor">
    <TextEditor
      bind:this={textEditor}
      placeholder="Say something..."
      mode="popover"
      buttons={['bold', 'italic', 'underline']}
      resizable
    />
  </div>
</div>
