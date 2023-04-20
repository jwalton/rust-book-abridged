# 19.4 - Advanced Functions and Closures

## Function Pointers

In [chapter 13][chap13] we saw you could pass a closure to a function, but we can also pass a function to a function!

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn do_twice(f: fn(i32) -> i32, arg: i32) -> i32 {
    f(arg) + f(arg)
}

fn main() {
    let answer = do_twice(add_one, 5);

    println!("The answer is: {}", answer);
}
```

The `fn` type her is called a _function pointer_. You may recall [from chapter 13][chap13] that to declare a function that takes a closure as a parameter, we declared a generic function and used a trait bound on the generic type, just as `FnOnce()`. The difference between a closure and a function pointer is that the function pointer is a concrete type.

Function pointers implement all three generic traits (`FnOnce`, `FnMut`, and `Fn`) so you can always pass a function pointer to a function that expects a trait. For this reason, it's generally more flexible to write a function that takes a closure. If you're interacting with C code, you might have to use a function pointer however.

Here's an example of using a function in place of a closure:

```rust
let list_of_numbers = vec![1, 2, 3];
let list_of_strings: Vec<String> =
    list_of_numbers.iter().map(|i| i.to_string()).collect();

// This is equivalent to the above:
let list_of_strings2: Vec<String> =
    list_of_numbers.iter().map(ToString::to_string).collect();
```

Each enum variant we define becomes an initializer function, so we can use them as function pointers:

```rust
enum Status {
    Value(u32),
    Stop,
}

let list_of_statuses: Vec<Status> = (0u32..20).map(Status::Value).collect();
```

## Returning Closures

Since a closure is defined using a trait, if you want to return one from a function you'll have to use a trait object:

```rust
fn returns_closure() -> Box<dyn Fn(i32) -> i32> {
    Box::new(|x| x + 1)
}
```

[chap13]: ../ch13-functional-language-features.md "Chapter 13: Functional Language Features: Iterators and Closures"
