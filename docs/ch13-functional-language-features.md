# 13 - Functional Language Features: Iterators and Closures

In this chapter we will cover _closures_, which are a like functions you can assign to variables or pass around as parameters. We'll also learn about _iterators_ which are used for iterating over a collection of items.

## 13.1 - Closures: Anonymous Functions that Capture Their Environment

A closure is essentially a function that can access variables in the enclosing scope. You can store a closure in a variable or pass it as a parameter.If you're a JavaScript programmer, you're no doubt very familiar with closures.

### Capturing the Environment with Closures

Here's the scenario that we're going to use for this section, taken directly from the original "The Rust Programming Language": Every so often, our t-shirt company gives away an exclusive, limited-edition shirt to someone on our mailing list as a promotion. People on the mailing list can optionally add their favorite color to their profile. If the person chosen for a free shirt has their favorite color set, they get that color shirt. If the person hasn't specified a favorite color, they get whatever color the company currently has the most of.

We'll implement this using an `enum ShirtColor` for the color of the shirt, and we'll use a `Vec<ShirtColor>` to represent stock - each item in the vector represents a t-shirt. We'll define a `giveaway` method on `Inventory` to figure out which shirt to give a customer:

```rust title="src/main.rs"
#[derive(Debug, PartialEq, Copy, Clone)]
enum ShirtColor {
    Red,
    Blue,
}

struct Inventory {
    // A vector of shirt colors, one for each shirt we have in stock.
    shirts: Vec<ShirtColor>,
}

impl Inventory {
    /// Figure out what color of shirt to give away.
    fn giveaway(&self, user_preference: Option<ShirtColor>) -> ShirtColor {
        user_preference.unwrap_or_else(|| self.most_stocked())
    }

    // Figure out what shirt color we have the most of in inventory.
    fn most_stocked(&self) -> ShirtColor {
        let mut num_red = 0;
        let mut num_blue = 0;

        for color in &self.shirts {
            match color {
                ShirtColor::Red => num_red += 1,
                ShirtColor::Blue => num_blue += 1,
            }
        }
        if num_red > num_blue {
            ShirtColor::Red
        } else {
            ShirtColor::Blue
        }
    }
}

fn main() {
    let store = Inventory {
        shirts: vec![ShirtColor::Blue, ShirtColor::Red, ShirtColor::Blue],
    };

    let user_pref1 = Some(ShirtColor::Red);
    let giveaway1 = store.giveaway(user_pref1);
    println!(
        "The user with preference {:?} gets {:?}",
        user_pref1, giveaway1
    );

    let user_pref2 = None;
    let giveaway2 = store.giveaway(user_pref2);
    println!(
        "The user with preference {:?} gets {:?}",
        user_pref2, giveaway2
    );
}
```

Everything here should be familiar. The part we want to focus on is the `giveaway` method, specifically this line:

```rust
user_preference.unwrap_or_else(|| self.most_stocked())
```

We're calling `unwrap_or_else` on an `Option<ShirtColor>`. If the `Option` is the `Some` variant, this will unwrap the value and return it, just like `unwrap`. But if it's `None`, this will call into the closure we pass as the first parameter: `|| self.most_stocked()`. This closure is a tiny function that takes no parameters (if there were some, they'd appear between the `||`) and returns the result of `self.most_stocked()`. Notice that the closure is using the `self` variable, which isn't being passed explicitly as a parameter to the closure. This parameter is _captured_ from the outer scope.

### Closure Type Inference and Annotation

With functions, we always have to annotate the type of the function. With closures, generally we don't have to annotate the types, as Rust can usually infer the correct types from the function we're passing the closure to. We can annotate them the same way we do functions though:

```rust
let expensive_closure = |num: u32| -> u32 {
    println!("calculating slowly...");
    thread::sleep(Duration::from_secs(2));
    num
};
```

Even if a closure is not annotated, it _does_ have concrete types. This example would fail to compile:

```rust
let example_closure = |x| x;

let s = example_closure(String::from("hello"));
let n = example_closure(5);
```

If we were to call this with only a `String`, then rust would infer the type of `x` in the closure to be a `String`. Since we call it once with a `String` and once with an `i32`, Rust won't know which it should be and will generate a compiler error.

### Capturing References or Moving Ownership

In JavaScript or Go, when a closure captures a value, this just counts as one more reference to the value for the garbage collector. Since Rust has no garbage collector, ownership rules apply to closures just like anywhere else. A closure can capture an immutable reference to a value, a mutable reference, or can take ownership of the value. Generally which of these happens is inferred by the compiler depending on what the closure does with the value.

```rust title="src/main.rs"
fn immutable_example() {
    let list = vec![1, 2, 3];
    println!("Before defining closure: {:?}", list);

    // Here `list` is captured as an immutable reference.
    let only_borrows = || println!("From closure: {:?}", list);

    println!("Before calling closure: {:?}", list);
    only_borrows();
    println!("After calling closure: {:?}", list);
}

fn mutable_example() {
    let mut list = vec![1, 2, 3];
    println!("Before defining closure: {:?}", list);

    // Here `list` is captured as a mutable reference,
    // since we `push` a new item onto the list.
    let mut borrows_mutably = || list.push(7);

    borrows_mutably();
    println!("After calling closure: {:?}", list);
}
```

In `mutable_example`, notice that we've declared the `borrows_mutably` closure as mutable itself! If you think about a closure as an implicit data structure, containing data captured from the environment, then in order to mutate any values held in that structure we have to declare the owning variable as `mut`. Second, notice that in `mutable_example` we can't print the contents of `list` in between when we create `borrows_mutably` and when we call it, since `borrows_mutably` has a mutable reference to `list` and if we have a mutable reference, we can't have any other references at the same time.

A closure will automatically take ownership of a value if it needs to. We can force a closure to take ownership of all captured values with the `move` keyword:

```rust title="src/main.rs"
use std::thread;

fn main() {
    let list = vec![1, 2, 3];
    println!("Before defining closure: {:?}", list);

    thread::spawn(move || println!("From thread: {:?}", list))
        .join()
        .unwrap();
}
```

Here we're transferring ownership of `list` to a new thread. We haven't covered threads yet, but we will in [chapter 16][chap16]. Transferring ownership is required here, because our `main` function might finish before the thread, or the thread might finish first. If the thread borrowed a mutable reference, and `main` finished first, the value would be dropped and the underlying memory would be freed, leaving the thread with a dangling reference.

### Moving Captured Values Out of Closures and the Fn Traits

Depending on what a closure does with the values it captures, the compiler will automatically add some or all of these traits to the closure:

- `FnOnce` applies to all closures. It represents a closure that can be called once. All closures can be called at least once, so all closures implement this trait. If a closure moves captured values out of it's body, then it will _only_ implement this trait. Such a closure can not safely be called twice, since it won't be able to move the captured values a second time.
- `FnMut` applies to any closure that doesn't move captured values out of its body. Despite the name, the closure may or may not mutate captured values. These closures can safely be called multiple times.
- `Fn` applies to any closure that implements `FnMut` but that also doesn't mutate any captured values. Such a closure can safely be called multiple times concurrently.

Let's take a look at the implementation of `Option<T>::unwrap_or_else`:

```rust
impl<T> Option<T> {
    pub fn unwrap_or_else<F>(self, f: F) -> T
    where
        F: FnOnce() -> T
    {
        match self {
            Some(x) => x,
            None => f(),
        }
    }
}
```

Here `T` is the type of the `Option<T>` itself, and `F` is the type of the parameter we pass to `unwrap_or_else`. `F` has a trait bound for `FnOnce() -> T`, which means F must be a closure that can be called at least once, takes no parameters, and must return a T. Since all closures implement `FnOnce`, this lets `unwrap_or_else` accept any closure.

A regular function can implement these traits as well! If what we are doing doesn't require capturing any values, we can use the name of a function in place of a closure when passing a closure to a function.

Let's have a look at another standard library function, `sort_by_key` defined on slices:

```rust title="src/main.rs"
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let mut list = [
        Rectangle { width: 10, height: 1 },
        Rectangle { width: 3, height: 5 },
        Rectangle { width: 7, height: 12 },
    ];

    list.sort_by_key(|r| r.width);
    println!("{:#?}", list);
}
```

This sorts the list in place, sorting by the `width` of each rectangle. `sort_by_key` takes a `FnMut` instead of a `FnOnce`. The closure we passed to `sort_by_key` doesn't mutate any values, but it does need to be called more than once (at least once for each `Rectangle`), so it can't be `FnOnce`.

If we tried to do something like:

```rust
let mut sort_operations = vec![];
let value = String::from("by key called");

// This doesn't compile!
list.sort_by_key(|r| {
    sort_operations.push(value);
    r.width
});
```

this wouldn't work. The problem here is that the closure takes ownership of `value` from the enclosing scope when it is created, then gives away ownership to `sort_operations` when it calls `push`. This means this closure only implements `FnOnce`. It can't be called a second time, since it won't be able to transfer ownership of `value` a second time. If we changed this closure to increment a counter in the enclosing scope instead of pushing a value onto a vector, this would fix the issue, as the closure could borrow the counter as a mutable reference, and would be `FnMut`.

## 13.2 - Processing a Series of Items with Iterators

In Rust, iterators are _lazy_, meaning if you create an iterator and then don't call any functions on it, the iterator won't do any work:

```rust
let v1 = vec![1, 2, 3];

// Create an iterator
let v1_iter = v1.iter();

// Do something for each item the iterator returns.
// The iterator doesn't do anything until we use it.
for val in v1_iter {
    println!("Got: {}", val);
}
```

### The `Iterator` Trait and the `next` Method

All iterators implement a trait from the standard library called, unsurprisingly, `Iterator`:

```rust
pub trait Iterator {
    type Item;

    fn next(&mut self) -> Option<Self::Item>;

    // --snip--
}
```

This trait uses some syntax we haven't seen before: `type Item` and `Self::Item`. This is called an _associated type_ and it's a very much like a generic type. We'll talk more about this in [chapter 19](./ch19/ch19-02-advanced-traits.md).

The part we `--snip--`ed out only contains methods with default implementations, so if you want to implement `Iterator`, you only need to implement `next`. Every time `next` is called, it returns `Some` item until it runs out of items, and then it returns `None`. For a vector, the items are returned in the same order they were present in the vector:

```rust
#[test]
fn iterator_demonstration() {
    let v1 = vec![1, 2, 3];

    let mut v1_iter = v1.iter();

    assert_eq!(v1_iter.next(), Some(&1));
    assert_eq!(v1_iter.next(), Some(&2));
    assert_eq!(v1_iter.next(), Some(&3));
    assert_eq!(v1_iter.next(), None);
}
```

Calling `next` on an iterator changes it's internal state, which is why the `self` parameter on `next` is marked `&mut`. This means we need to declare `v1_iter` as `mut` here as well. In the example above where we used a for loop, you might notice we didn't make `v1_iter` mutable. This is because the `for` loop [took ownership of the iterator](https://doc.rust-lang.org/std/iter/index.html#for-loops-and-intoiterator) and made it mutable - sneaky Rust.

Another thing to note is that the iterator returned by `iter` returns immutable references to the underlying collection. There's an `iter_mut` that returns mutable references, if we want to modify some or all of the members of a collection. There's also an `into_iter` which takes ownership of the receiver (`into` because it converts the underlying collection into an iterator, and you won't be able to access the underlying collection anymore) and returns owned values. For example, if you called `v1.into_iter` above, you'd get back an iterator of owned values, and wouldn't be able to use `v1` anymore.

### Methods that Consume the Iterator

If you have a look at [the documentation for `Iterator`](https://doc.rust-lang.org/std/iter/trait.Iterator.html#provided-methods) you'll see that it provides quite a few methods with default implementations. Many of these call into `next`, which is why you don't have to implement them all. Calling into `next` though means that these will consume some or all of the items in the iterator. We call these _consuming adaptors_.

The [`sum` method](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.sum) for example will consume all items in the iterator and sum them together. In order to ensure we can't use an iterator after calling `sum`, `sum` takes ownership of the iterator.

### Methods that Produce Other Iterators

_Iterator adaptors_ are methods on an iterator that don't consume the contents of the iterator, but they do take ownership of the iterator, converting it into some new kind of iterator. A common example of this is the `map` method (which should be familiar if you're coming from JavaScript):

```rust
let v1: Vec<i32> = vec![1, 2, 3];

let v2: Vec<_> = v1.iter().map(|x| x + 1).collect();
```

Here `v2` will be `vec![2, 3, 4]`. `map` produces a new iterator of modified items from the underlying vector.

We call `collect` here to transform the new iterator returned by `map` into a vector. Note that `map`, by itself, consumes no values! Until we call `collect` the closure won't be called. This "lazy" behavior is a bit different from `map` in JavaScript.

### Using Closures that Capture Their Environment

The `filter` method (another familiar method for the JavaScript folks) is another iterator adaptor, which consumes the old iterator and returns a new one. It's parameter is a closure that returns a boolean, which is used to "filter out" some elements from the underlying iterator. The closure is called for each item, and if it returns true the new iterator will include the item, if false the item will be discarded:

```rust
#[derive(PartialEq, Debug)]
struct Shoe {
    size: u32,
    style: String,
}

fn shoes_in_size(shoes: Vec<Shoe>, shoe_size: u32) -> Vec<Shoe> {
    shoes.into_iter().filter(|s| s.size == shoe_size).collect()
}
```

Notice here that the closure captures `shoe_size` from the environment and uses it to decide whether a shoe should be included in the returned vector or not.

## 13.3 - Improving our I/O Project

With our new friend the iterator we can revisit our project from [chapter 12][chap12] and make some of the code clearer and more concise.

### Removing a `clone` Using an Iterator

In chapter 12 we wrote this `Config` struct:

```rust
impl Config {
    pub fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("not enough arguments");
        }

        let query = args[1].clone(); // <= Ugly clone! It hurts us!
        let file_path = args[2].clone();

        let ignore_case = env::var("IGNORE_CASE").is_ok();

        Ok(Config {
            query,
            file_path,
            ignore_case,
        })
    }
}
```

and we promised that when we got to chapter 13, we'd talk more about that call to `clone`. Our problem here was that the `args` vector passed in here owns the strings we want to use, and we're only borrowing `args` so we can't take ownership of them. But, if we go look at where `build` is called:

```rust
let args: Vec<String> = env::args().collect();

let config = Config::build(&args).unwrap_or_else(|err| {
    println!("Problem parsing arguments: {err}");
    process::exit(1);
});
```

we're actually getting an iterator back from `env::args()` and converting the iterator into a vector. Instead of doing this, we could pass the iterator directly to `build`, then `build` can consume the iterator and take ownership of the strings. In the caller we change the above to:

```rust
let config = Config::build(env::args()).unwrap_or_else(|err| {
    eprintln!("Problem parsing arguments: {err}");
    process::exit(1);
});
```

And then in `build` we can do:

```rust
impl Config {
    pub fn build(
        mut args: impl Iterator<Item = String>,
    ) -> Result<Config, &'static str> {
        args.next();

        let query = match args.next() {
            Some(arg) => arg,
            None => return Err("Didn't get a query string"),
        };

        let file_path = match args.next() {
            Some(arg) => arg,
            None => return Err("Didn't get a file path"),
        };

        let ignore_case = env::var("IGNORE_CASE").is_ok();

        Ok(Config {
            query,
            file_path,
            ignore_case,
        })
    }
}
```

We've updated the function signature so `args` is now a generic type with a trait bound allowing any iterator which returns Strings. Since we're taking ownership of `args` and we'll be mutating it, we'll mark it as `mut`. Then we read out parameters one by one. We start with a call to `args.next()` to skip over the first parameter - the name of our executable - then we copy each subsequent value into a variable, taking ownership without having to clone anything.

### Making Code Clearer with Iterator Adaptors

Recall our original implementation of `search`:

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.contains(query) {
            results.push(line);
        }
    }

    results
}
```

We can now rewrite this in a more functional style, and eliminate our mutable `results` vector:

```rust
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    contents
        .lines()
        .filter(|line| line.contains(query))
        .collect()
}
```

### Choosing Between Loops or Iterators

In general, the "functional" style with iterators is preferred by most Rust programmers. The code is more concise, and in most cases will be easier to read. In our `search` example, a theoretical enhancement would be to do the filtering in parallel across multiple threads. This will be easier to do now that we no longer has to manage a mutable `results` vector.

## 13.4 Comparing Performance: Loops vs. Iterators

How well do iterators perform? The original "The Rust Programming Language" had this to say:

> We ran a benchmark by loading the entire contents of The Adventures of Sherlock Holmes by Sir Arthur Conan Doyle into a `String` and looking for the word "the" in the contents. Here are the results of the benchmark on the version of `search` using the `for` loop and the version using iterators:
>
> ```txt
> test bench_search_for ... bench: 19,620,300 ns/iter (+/- 915,700)
> test bench_search_iter ... bench: 19,234,900 ns/iter (+/- 657,200)
> ```

We can see that for our implementation, the iterator implementation was ever so slightly faster. Understand the point here is not to say "iterators are faster" or "for loops are faster", the point is that in most situations, they're going to be pretty close. Rust calls iterators a _zero cost abstraction_ meaning that they don't add any extra overhead over "hand coding" a solution. If you try to use an iterator over a short fixed size array, in many cases Rust will "unroll the loop" and if you examine the underlying assembly, you'll find no loop at all, no bounds checks, and all your values stored in registers, exactly as if you'd hand coded it.

If you really need to eek out every last bit of performance, you'll want to write some [benchmark tests](https://doc.rust-lang.org/unstable-book/library-features/test.html) that exercise your code with a variety of different inputs.

Continue to [chapter 14][chap14].

[chap12]: ./ch12-io-project-cli.md "Chapter 12: An I/O Project: Building a Command Line Program"
[chap14]: ./ch14-more-about-cargo.md "Chapter 14: More About Cargo and Crates.io"
[chap16]: ./ch16-fearless-concurrency.md "Chapter 16: Fearless Concurrency"
