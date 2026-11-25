const images: Record<string, string> = {
  "culinary-practice": "/images/culinary-practice.webp",
  "venture-workshop": "/images/venture-workshop.webp",
  "food-photography": "/images/food-photography.webp",
  "study-plan": "/images/study-plan.webp",
};
export function illustration(name: string) {
  return images[name];
}
