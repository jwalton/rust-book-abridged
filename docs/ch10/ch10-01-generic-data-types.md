# 10.1 - Generic Data Types

## In Function Definitions

We can use generics to define a function that can accept different data types. This is just like generics in TypeScript, Java, and Go, or like template functions in C++.

Here's an example of a function to find the largest number in a list:

```rust
fn largest_i32(list: &[i32]) -> &i32 {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}


fn main() {
    let number_list = vec![34, 50, 25, 100, 65];

    let result = largest_i32(&number_list);
    println!("The largest number is {}", result);
}
```

The problem with this function is that it can only accept a list of `i32`. If we wanted to write a version of this for `char` or for `u64`, the function signature would change, but the code in body would be identical. We can use generics here to write the function to accept any number by changing the function signature to:

```rust
// This doesn't QUITE work...
fn largest<T>(list: &[T]) -> &T {
```

The `<T>` after the function name tells the compiler this is a generic function, so anywhere inside the function body where there's a `T`, we'll replace it with some concrete type when the function is actually called. (Or actually, when it's compiled. We'll compile one version of this function for each type it is used with.)

If you actually try to compile the above though, `rustc` will complain. The problem is that `T` here could be an `i32` or a `u64`... but it could also be a `struct` or some other arbitrary type. Inside the function we do `item > largest` - how would we decide if one struct was larger than another? We need to restrict what kinds of types can be used in place of T with a _trait bound_. In this case we only want to allow T to be a type that implements the `str::cmp::PartialOrd` trait. Types that implement this trait can be compared to each other:

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T {
```

Why a single letter `T` for the generic type? It doesn't have to be; you can use `fn largest<Number>...` instead, and it will work. But in almost every language that supports something like generics, the convention is to use a single character.

## In Struct Definitions

Generics aren't just for functions, we can also use them in structs. Here we have a `Point` struct which has an x and a y. Both x and y are type `T`, so they must both be the same type:

```rust
struct Point<T> {
    x: T,
    y: T,
}

fn main() {
    let integer = Point { x: 5, y: 10 };
    let unsigned: Point<u32> = Point { x: 9, y: 20 };
    let float = Point { x: 1.0, y: 4.0 };

    // This won't work, because we're trying to use two different types
    let wont_work = Point { x: 5, y: 4.0 };
}
```

If we want to support mixed types we can, but we'll have to redefine the struct to allow it:

```rust
struct MultiPoint<T, U> {
    x: T,
    y: U,
}
```

## In Method Definitions

If we create a struct with generic properties, it makes sense that we'll have to define methods that are generic too:

```rust
pub struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    pub fn x(&self) -> &T {
        &self.x
    }
}
```

Note the `impl<T>` - we need the `<T>` here to let the compiler know that `T` is not a concrete type. Why? Because we can also declare methods only on specific concrete versions of a generic struct. This will add a `distance_from_origin` to `Point<f32>`, but not to any other Point, such as `Point<u32>`:

```rust
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}
```

We can also add generics to a method that are not related to the generics on the struct:

```rust
struct Point<X1, Y1> {
    x: X1,
    y: Y1,
}

impl<X1, Y1> Point<X1, Y1> {
    // Note that mixup takes `X2` and `Y2` generic types,
    // in addition to `X1` and `Y1` from the struct!
    fn mixup<X2, Y2>(self, other: Point<X2, Y2>) -> Point<X1, Y2> {
        Point {
            x: self.x,
            y: other.y,
        }
    }
}

fn main() {
    let p1 = Point { x: 5, y: 10.4 };
    let p2 = Point { x: "Hello", y: 'c' };

    let p3 = p1.mixup(p2);

    println!("p3.x = {}, p3.y = {}", p3.x, p3.y);
}
```

## In Enum Definitions

We've already seen a few enums that use generics such as `Option<T>` and `Result<T, E>`:

```rust
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

## Performance of Code Using Generics

Much like C++ template functions, Rust generics are implemented using _monomorphization_, which is a fancy way of saying it generates a copy of each generic type at compile time, one copy for each type it was used with.

In other words, if we go back to the `fn largest<T>(list: &[T]) -> &T` we started this section with, if you were to call:

```rust
    let number_list = vec![34, 50, 25, 100, 65];
    let result = largest(&number_list);

    let char_list = vec!['y', 'm', 'a', 'q'];
    let result = largest(&char_list);
```

then internally Rust would actually compile two different functions, a `largest<i32>` and a `largest<char>`. This means generic have no runtime performance impact, but they do make your executable larger.
