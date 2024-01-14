<script>
  import {
    Button,
    Icon,
    TextEditor
  } from 'framework7-svelte';
  import { onMount, afterUpdate } from 'svelte';
  import escapeHtml from '../js/escapehtml';
  import innerTextPolyfill from '../js/innertext';

  export let chats = [];
  export let aggregate = [];
  export let pendingChats;
  export let onSend;

  let chat;
  let textEditor;
  let isScrolledToBottom = true;
  let myUid;

  function sendMessage() {
    const instance = textEditor.instance();
    //let text = instance.getValue();
    let text = instance.contentEl.innerText || innerTextPolyfill(instance.contentEl);
    /*if (text.endsWith('<br>')) {
      // ^^ Firefox does this so delete the trailing <br>.
      text = text.substring(0, text.length - 4);
    }*/
    text = text.trim();
    instance.clearValue();
    if (text === '') {
      return;
    }
    onSend(text);
  }

  onMount(() => {
    myUid = localStorage.getItem('uid');

    textEditor.instance().contentEl.addEventListener('keydown', function(e) {
      if (e.composing || e.keyCode === 229) {
        return;
      }
      // TODO: On mobile, pressing return should add a new line.
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        e.target.blur();
        e.target.focus();
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
    margin: 0 0 1em 0;
  }

  p.chatbubble:first-child, .chat-from:first-child {
    margin-top: 1em;
  }

  p.chatbubble:has(+ div.clear-both) {
    margin-bottom: 0;
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

  .chat-left:has(+ .chat-left), .chat-right:has(+ .chat-right) {
    margin-bottom: .25em;
  }

  .chat-from {
    float: left;
    clear: both;
    margin: 0;
    font-size: 85%;
  }

  .clear-both {
    clear: both;
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
    display: flex;
    flex-flow: row;
    align-items: flex-end;
  }

  :global(.chat-send-button) {
    flex: 0 1 auto;
    margin: var(--f7-text-editor-margin) 0;
  }

  :global(.ios .chat-send-button) {
    margin-bottom: calc(1.3333 * var(--f7-text-editor-margin));
  }
</style>

<div class="container">
  <div bind:this={chat} class="chat">
    {#each aggregate as agg (agg.id)}
      {#if agg.chats[0].from !== myUid}
        <p class="chat-from">{agg.chats[0].fromName}</p>
      {/if}
      {#each agg.chats as chat (chat.id)}
        {#if chat.from !== myUid}
          <p class="chatbubble chat-left">{@html chat.text}</p>
        {:else}
          <p class="chatbubble chat-right">{@html chat.text}</p>
        {/if}
      {/each}
    {/each}
    {#each chats as chat (chat.id)}
      {#if chat.from !== myUid}
        <p class="chatbubble chat-left">{@html chat.text}</p>
      {:else}
        <p class="chatbubble chat-right">{@html chat.text}</p>
      {/if}
    {/each}
    {#each pendingChats as chat (chat.uuid)}
      <p class="chatbubble chat-right chat-pending">{@html escapeHtml(chat.text)}</p>
    {/each}
    <div class="clear-both"></div>
  </div>
  <div class="editor">
    <TextEditor
      bind:this={textEditor}
      placeholder="Say something..."
      mode=""
      resizable
      style="flex: 1 1 auto; margin-right: 0"
    />
    <Button class="chat-send-button" onClick={sendMessage}>
      <Icon ios="f7:arrow_up_circle_fill" md="material:send" />
    </Button>
  </div>
</div>
