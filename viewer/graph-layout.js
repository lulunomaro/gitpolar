// Independently implemented lane routing. Input must be child-before-parent Git topology.
export const graphColors=['#0969da','#8250df','#1a7f37','#bf3989','#bc4c00','#0598a5','#9a6700','#cf222e'];
export function layoutGraph(commits,{rowHeight=42,laneWidth=22,padding=19}={}) {
  const lanes=[],rows=[],segments=[];let colors=0,maxLanes=1;
  const vacant=()=>{const at=lanes.findIndex(x=>!x);return at<0?lanes.length:at;};
  for(let row=0;row<commits.length;row++) {
    const commit=commits[row];let lane=lanes.findIndex(x=>x?.oid===commit.oid);
    if(lane<0){lane=vacant();lanes[lane]={oid:commit.oid,color:graphColors[colors++%graphColors.length]};}
    const node=lanes[lane],y=row*rowHeight+rowHeight/2;
    for(let i=0;i<lanes.length;i++)if(lanes[i]&&i!==lane)segments.push({from:i,to:i,y,color:lanes[i].color,target:lanes[i].oid});
    lanes[lane]=null;
    for(let index=0;index<commit.parents.length;index++) {
      const parent=commit.parents[index];let to=lanes.findIndex(x=>x?.oid===parent);
      if(to<0){to=index===0&&!lanes[lane]?lane:vacant();lanes[to]={oid:parent,color:index===0?node.color:graphColors[colors++%graphColors.length]};}
      segments.push({from:lane,to,y,color:lanes[to].color,target:parent,source:commit.oid});
    }
    rows.push({oid:commit.oid,lane,x:padding+lane*laneWidth,y,color:node.color});
    maxLanes=Math.max(maxLanes,lanes.length);
  }
  const width=padding*2+(maxLanes-1)*laneWidth;
  return {rows,segments,width,height:commits.length*rowHeight,rowHeight,laneWidth,padding};
}
export function segmentPath(segment,layout) {
  const x=layout.padding+segment.from*layout.laneWidth,to=layout.padding+segment.to*layout.laneWidth,y=segment.y,end=y+layout.rowHeight;
  return x===to?'M '+x+' '+y+' V '+end:'M '+x+' '+y+' C '+x+' '+(y+layout.rowHeight*.6)+' '+to+' '+(y+layout.rowHeight*.4)+' '+to+' '+end;
}
