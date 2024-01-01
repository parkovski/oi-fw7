<script>
  import { onMount } from 'svelte';

  export let range = false;
  export let value;

  let hours;
  let minutes;
  let ampm;
  let hoursEnd;
  let minutesEnd;
  let ampmEnd;

  function to24Hr(hours, minutes, ampm) {
    hours = +hours;
    if (ampm === 'pm' && hours < 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }
    if (hours < 10) {
      return `0${hours}:${minutes}`;
    } else {
      return `${hours}:${minutes}`;
    }
  }

  function to12Hr(hours, minutes) {
    hours = +hours;
    minutes = +minutes;
    if (minutes < 10) {
      minutes = '0' + minutes;
    } else {
      minutes = '' + minutes;
    }
    if (hours === 0) {
      return ['12', minutes, 'am'];
    } else if (hours < 12) {
      return ['' + hours, minutes, 'am'];
    } else if (hours === 12) {
      return ['' + hours, minutes, 'pm'];
    } else {
      return ['' + (hours - 12), minutes, 'pm'];
    }
  }

  function watchValue(value) {
    let [watchedHours, watchedMinutes] = value[0].split(':');
    watchedHours = +watchedHours;
    watchedMinutes = +watchedMinutes;
    watchedMinutes = Math.floor(watchedMinutes / 5) * 5;
    const hr12 = to12Hr(watchedHours, watchedMinutes);
    hours = hr12[0];
    minutes = hr12[1];
    ampm = hr12[2];

    if (range) {
      let [watchedHoursEnd, watchedMinutesEnd] = value[1].split(':');
      watchedHoursEnd = +watchedHoursEnd;
      watchedMinutesEnd = +watchedMinutesEnd;
      watchedMinutesEnd = Math.floor(watchedMinutesEnd / 5) * 5;
      const hr12End = to12Hr(watchedHoursEnd, watchedMinutesEnd);
      if (watchedHoursEnd < watchedHours) {
        hoursEnd = hr12[0];
        ampmEnd = hr12[2];
        if (watchedMinutesEnd < watchedMinutes) {
          minutesEnd = hr12[1];
        }
      } else if (watchedHoursEnd === watchedHours && watchedMinutesEnd < watchedMinutes) {
        minutesEnd = hr12[1];
      } else {
        hoursEnd = hr12End[0];
        minutesEnd = hr12End[1];
        ampmEnd = hr12End[2];
      }
    }
  }

  $: value = [to24Hr(hours, minutes, ampm)]
    .concat(range ? to24Hr(hoursEnd, minutesEnd, ampmEnd) : []);
  $: watchValue(value);

  onMount(() => {
    const now = new Date();
    const nowHours = now.getHours();
    const nowMinutes = Math.floor(now.getMinutes() / 5) * 5;
    const time = to12Hr(nowHours, nowMinutes);
    hours = hoursEnd = time[0];
    minutes = minutesEnd = time[1];
    ampm = ampmEnd = time[2];
  });
</script>

<style>
  div.container {
    display: inline-block;
  }
</style>

<div>
  <div class="container">
    <select bind:value={hours}>
      <option value="1"> 1 </option>
      <option value="2"> 2 </option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5</option>
      <option value="6">6</option>
      <option value="7">7</option>
      <option value="8">8</option>
      <option value="9">9</option>
      <option value="10">10</option>
      <option value="11">11</option>
      <option value="12">12</option>
    </select>
  </div>:
  <div class="container">
    <select bind:value={minutes}>
      <option value="00">00</option>
      <option value="05">05</option>
      <option value="10">10</option>
      <option value="15">15</option>
      <option value="20">20</option>
      <option value="25">25</option>
      <option value="30">30</option>
      <option value="35">35</option>
      <option value="40">40</option>
      <option value="45">45</option>
      <option value="50">50</option>
      <option value="55">55</option>
    </select>
  </div>
  <div class="container">
    <select bind:value={ampm}>
      <option value="am">am</option>
      <option value="pm">pm</option>
    </select>
  </div>
  {#if range}
    to
    <div class="container">
      <select bind:value={hoursEnd}>
        <option value="1"> 1 </option>
        <option value="2"> 2 </option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
        <option value="6">6</option>
        <option value="7">7</option>
        <option value="8">8</option>
        <option value="9">9</option>
        <option value="10">10</option>
        <option value="11">11</option>
        <option value="12">12</option>
      </select>
    </div>:
    <div class="container">
      <select bind:value={minutesEnd}>
        <option value="00">00</option>
        <option value="05">05</option>
        <option value="10">10</option>
        <option value="15">15</option>
        <option value="20">20</option>
        <option value="25">25</option>
        <option value="30">30</option>
        <option value="35">35</option>
        <option value="40">40</option>
        <option value="45">45</option>
        <option value="50">50</option>
        <option value="55">55</option>
      </select>
    </div>
    <div class="container">
      <select bind:value={ampmEnd}>
        <option value="am">am</option>
        <option value="pm">pm</option>
      </select>
    </div>
  {/if}
</div>
