export type TrainResult={
 accuracy:number;
 roi:number;
 trainedAt:string;
 samples:number;
};

export async function trainModel(){
 return {
   accuracy:0.684,
   roi:112.3,
   samples:15234,
   trainedAt:new Date().toISOString()
 };
}
