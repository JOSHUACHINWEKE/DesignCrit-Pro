export function calculateOverallScore(report) {
  const scores = [
    Number(report?.colour?.score || 0),
    Number(report?.typography?.score || 0),
    Number(report?.layout?.score || 0),
    Number(report?.accessibility?.score || 0)
  ];
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function calculateImprovement(pre, post) {
  const preOverall = calculateOverallScore(pre);
  const postOverall = calculateOverallScore(post);

  return {
    colour: Number(post.colour.score) - Number(pre.colour.score),
    typography: Number(post.typography.score) - Number(pre.typography.score),
    layout: Number(post.layout.score) - Number(pre.layout.score),
    accessibility: Number(post.accessibility.score) - Number(pre.accessibility.score),
    overall: postOverall - preOverall,
    preOverall,
    postOverall
  };
}
