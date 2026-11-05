# Mock Java Practice Set (made up for testing, not from any real exam)

Page 12 — Mock Java Press, all rights reserved

**Set 1: Collections and Language Basics**

1. Which TWO declarations compile? (Choose two.)
A. List<int> a = new ArrayList<>();
B. List<Integer> b = new ArrayList<>();
C. var c = null;
D. var d = new ArrayList<String>();

2. What does this print?

    1: var list = new ArrayList<>(List.of(1, 2, 3));
    2: list.remove(1);
    3: System.out.println(list);

A. [1, 3]
B. [2, 3]
C. The code does not compile on line 2.
D. None of the above

3. True or false: a record can extend another class.

4. See the diagram below, showing a class hierarchy. Which class is the root?
A. Animal
B. Dog
[diagram: a picture of a class hierarchy]

Page 13 — Mock Java Press, all rights reserved

5. Which keyword stops a method being overridden?
A. static
B. final
C. Both A and B
D. abstract

6. Using the code from question 2, what is list.size() after line 2?
A. 1
B. 2
C. 3

7. Explain, in a sentence or two, why a virtual thread suits work that blocks on I/O.

8. Drag each collection type to its matching behaviour.
[interactive matching exercise]

9. What does this print?

    System.out.println(“a” + 1 + 2);

A. a12
B. a3
C. Does not compile

10. Which statement about `String` is correct?
A. Strings are immutable.
B. Strings can be changed in place with the setCharAt method.

## Answers and explanations

1. B, D. A is invalid because generics need reference types. C does not compile because the type can't be inferred from null.
2. A. remove(int) removes by index. B would be right only if it removed by value.
3. False. Records implicitly extend java.lang.Record.
4. A.
5. B. C is wrong because static methods are hidden rather than overridden.
6. B.
7. A blocked virtual thread releases its carrier thread, so a few platform threads can serve many waiting tasks.
8. (see the online version)
9. B.
10. A. Strings never change after creation.
