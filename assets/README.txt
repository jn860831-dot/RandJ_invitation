此資料夾用來放實際的圖片與音樂檔案。

建議圖片清單（對應 index.html 裡的 .photo-placeholder）：
- cover.jpg        封面主視覺照片（直式，建議 750×1334 以上）
- story-1.jpg ~ story-5.jpg   我們的故事時間軸照片（建議 4:3）
- gallery-1.jpg ~ gallery-6.jpg 相簿照片（建議 1:1 正方形）

放好圖片後，把 index.html 裡對應的
  <div class="photo-placeholder ..." data-label="..."></div>
換成
  <img class="..." src="assets/檔名.jpg" alt="說明文字">
即可（記得把 class 保留，樣式才會正確）。

背景音樂：
- 放一個 music.mp3 進來，然後到 index.html 找到
  <audio id="bg-music" loop preload="none">
  把裡面被註解掉的 <source src="assets/music.mp3" type="audio/mpeg"> 取消註解即可。
