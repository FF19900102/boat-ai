export const venues = [
  { id:'hamanako', name:'浜名湖', area:'東海', status:'開催中' },
  { id:'gamagori', name:'蒲郡', area:'東海', status:'ナイター' },
  { id:'tokoname', name:'常滑', area:'東海', status:'開催中' },
  { id:'heiwajima', name:'平和島', area:'関東', status:'開催中' },
  { id:'toda', name:'戸田', area:'関東', status:'開催中' },
  { id:'edogawa', name:'江戸川', area:'関東', status:'開催中' },
  { id:'suminoe', name:'住之江', area:'近畿', status:'ナイター' },
  { id:'marugame', name:'丸亀', area:'四国', status:'ナイター' },
  { id:'omura', name:'大村', area:'九州', status:'ナイター' },
  { id:'karatsu', name:'唐津', area:'九州', status:'モーニング' }
];
const names = ['山田 祐也','佐藤 大介','鈴木 勝','田中 豪','加藤 翔','中村 亮'];
export function defaultWeather(venueId='hamanako'){
  const seed=venueId.length;
  return {sky:'晴', windDirection:['北','東','南','西'][seed%4], windSpeed: (seed%5)+1, waveHeight: (seed%4)+2};
}
export function createBoats(venueId='hamanako', raceNo=1){
  const shift = (venueId.length + Number(raceNo)) % 6;
  return [1,2,3,4,5,6].map((num,i)=>({
    frame:num,
    name:names[(i+shift)%6],
    classRank:['A1','A2','A1','B1','A2','B1'][i],
    nationalWin: +(6.8 - i*0.38 + (raceNo%3)*0.08).toFixed(2),
    localWin: +(6.2 - i*0.28 + (venueId.length%3)*0.12).toFixed(2),
    avgST: +(0.13 + i*0.012).toFixed(2),
    motorRate: +(42 - i*2.4 + (raceNo%4)).toFixed(1),
    boatRate: +(36 - i*1.6 + (venueId.length%4)).toFixed(1),
    exhibition: +(6.70 + i*0.03 - (raceNo%2)*0.01).toFixed(2),
    tilt: ['-0.5','0','0','0','0.5','0'][i],
    weight: +(52 + i*0.7).toFixed(1)
  }));
}
