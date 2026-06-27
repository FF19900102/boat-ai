export function buildMotorHistoryFeatures(history:number[]=[]){
 const avg=history.length?history.reduce((a,b)=>a+b,0)/history.length:0;
 return {
   motor_history_avg:Number(avg.toFixed(2)),
   motor_history_best:history.length?Math.max(...history):0,
   motor_history_worst:history.length?Math.min(...history):0,
   motor_history_count:history.length
 };
}
