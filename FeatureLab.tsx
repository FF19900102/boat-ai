export function buildCourseFeatures(lane:number){
  return {
    course_lane: lane,
    course_inside: lane<=2,
    course_outside: lane>=5,
    course_bias: ({1:1.0,2:0.82,3:0.74,4:0.66,5:0.53,6:0.45} as Record<number,number>)[lane] ?? 0.5
  };
}
