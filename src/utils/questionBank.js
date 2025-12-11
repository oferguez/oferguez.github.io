function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createQuestion({ a, b, op }, index) {
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const prompt = `${a} ${op} ${b} = ?`;
  const distractors = new Set();
  const range = Math.floor(10 + 0.8 * answer); // bound by 10, in case the answer is very small
  while (distractors.size < 3) {
    let candidate = Math.abs(Math.floor((Math.random() - 0.5) * range) + answer);
    if (range > 50) {
      // try and have the distractors with the same last digit as the answer, 
      // so it will be less easy to guess up
      const candidate_same_last_digit = candidate + (answer % 10 - candidate % 10) 
      if (!distractors.has(candidate_same_last_digit))
        candidate = candidate_same_last_digit
    }
    if (candidate !== answer && !distractors.has(candidate)) {
      distractors.add(candidate);
    }
  }
  const choices = shuffle([answer, ...distractors]);
  return {
    id: `q-${index}`,
    prompt,
    answer,
    choices,
  };
}

function createQuestionBank() {
  const additions = [];
  for (let a = 350; a <= 500; a += 5) {
    for (let b = 130; b <= 250; b += 11) {
      additions.push({ a, b, op: '+' });
    }
  }

  const subtractions = [];
  for (let a = 50; a <= 70; a += 3) {
    for (let b = 30; b <= a; b += 7) {
      const result = a - b;
      if (result >= 0 && result <= 30) {
        subtractions.push({ a, b, op: '-' });
      }
    }
  }

  const multiplications = [];
  for (let a = 3; a <= 10; a += 1) {
    for (let b = 2; b <= a; b += 1) {
      const result = a * b;
      if (result >= 0 && result <= 20) {
        multiplications.push({ a, b, op: '*' });
      }
    }
  }

  const additionSet = shuffle(additions).slice(0, 20);
  const subtractionSet = shuffle(subtractions).slice(0, 20);
  const multiplicationsSet = shuffle(multiplications).slice(0, 20);
  return shuffle([...additionSet, ...subtractionSet, ...multiplicationsSet]).map((item, index) =>
    createQuestion(item, index)
  );
}

export { createQuestionBank, createQuestion, shuffle };
