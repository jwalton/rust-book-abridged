# 15 - Smart Pointers

In C++, whenever we want to store an object on the heap, we `new` that object to allocate some memory. At some later point in time, we have to `delete` that memory. This is much like `malloc` and `free` in standard C.

C++ has a few different "smart pointers" that will delete that memory for you at the appropriate time. The most commonly used is probably `shared_ptr`, which keeps a _reference count_ on the heap. Every time your clone a `shared_ptr` it increments the reference count (which is shared between all the clones), and every time one is destroyed it decrements the count. Once the count reaches 0, `shared_ptr` knows there are no more references to the underlying memory so it is safe to be freed.

Rust has a variety of smart pointer objects as well, which allow us to store values on the heap, including `Rc<T>` which works much like C++'s `shared_ptr` and allows us to effectively share ownership of a value across multiple variables in code. This chapter will explore a few of the different smart pointer implementations in Rust and where you might want to use them.

Smart pointers in Rust generally implement the `Drop` trait (so they can run some custom code when they are dropped, like decrementing a reference count) and the `Deref` trait (which lets a smart pointer be used in place of a reference to the underlying value).

## 15.1 - Using `Box<T>` to Point to Data on the Heap

`Box<T>` is perhaps the "least smart" of the smart pointers. `Box<T>` lets us store a single piece of data on the heap instead of on the stack:

```rust title="src/main.rs"
fn main() {
    let b = Box::new(5);
    println!("b = {}", b);
}
```

Here "5" gets stored as four bytes on the heap instead of as four bytes on the stack. Notice that we can use `b` exactly like a `&i32` when we pass it to `println!`.

Why would we want to do this? When we're passing data around on the stack, Rust has to know the size of that data at compile time. When we pass an `i32` as a parameter, for example, Rust knows that it's going to need 4 bytes on the stack to hold that parameter. But sometimes we don't know the size of a value ahead of time, and this is where `Box<T>` is useful - examples would be recursive data structures (which can be "infinitely" large since they can contain more of themselves) and trait objects, where we want to claim that a parameter implements a specific trait but we don't care what concrete type the parameter is (we'll talk more about these in [chapter 17](./ch17-object-oriented-features.md#172---using-trait-objects-that-allow-for-values-of-different-types)).

In these cases, instead of passing the value directly on the stack, we pass the `Box<T>` on the stack and put the unknown-sized value on the heap. The size of `Box<T>` is known at compile time, so the compiler can do it's thing.

Another example where `Box<T>` would be useful is where you have some particularly large piece of data that you want to pass around. Values passed on the stack are pass-by-copy, and copying large amounts of data can be inefficient. Storing the data on the heap lets us pass around copies of the relatively small `Box<T>` instead.

### Enabling Recursive Types with Boxes

This is a data structure called the _cons list_ which we're going to borrow from lisp:

```rust
enum List {
    Cons(i32, List),
    Nil,
}
```

This is sort of a "linked list", where each item is either an `i32` and a "next item on the list", or else is `Nil` (to signify the end of the list). We could use this like:

```rust
use List::{Cons, Nil}

fn main() {
    let list = Cons(1, Cons(2, Cons(3, Nil)));
}
```

This is probably not a data structure you'd actually want to use in Rust, but it's a recursive data structure that's convenient for this example. If you try to compile the above, it will fail, because Rust can't work out the size of the `list` variable to store it on the stack.

For an enum, Rust will allocate enough memory to store the largest of the enum's variants. Here the largest is going to be `Cons`, which can hold an `i32` and a `List`, so it's four bytes long plus the size of a `List`. But this is a recursive definition - `sizeof(List) = 4 + sizeof(List)`. This makes `rustc` an unhappy compiler.

The solution is to move this to the heap:

```rust title="src/main.rs"
use List::{Cons, Nil}

enum List {
    Cons(i32, Box<List>),
    Nil,
}

fn main() {
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
}
```

Now `sizeof(Cons) = 4 + sizeof(Box<List>)`, and the size of `Box<List>` doesn't depend on the size of `<List>` (since that part is stored on the heap), so the size of the `list` variable is known at compile time.

## 15.2 Treating Smart Pointers Like Regular References with the `Deref` Trait

In this section we're going to implement our own smart pointer called `MyBox`. Our smart pointer won't actually store anything on the heap, it will just store things on the stack. It will be even less smart than a regular `Box<T>`, but it will give us a chance to explore the `Deref` trait.

### Following the Pointer to the Value

Before we talk about `Deref`, let's talk about what we mean by dereferencing.

```rust title="src/main.rs"
fn main() {
    let x = 5;
    let y = &x;

    assert_eq!(5, x);
    assert_eq!(5, *y);
}
```

Here `x` is of type `i32`, but `y` is of type `&i32`. `y` is essentially a pointer to `x`. We can assert that x is equal to 5, but in order to get to the value of `y` we have to _dereference_ it to get to the value that `y` points to. Rust will automatically dereference a value for you in many places, so the `*` operator doesn't get much use in Rust, but there are places (like in this example) where it is required.

:::info

If you're coming from a language like C or Go, this is probably second nature to you. If you're coming from JavaScript, this might be a new concept. Because `y` here points to the memory that stores the `x` value, you can think about `*y` as basically an alias for `x`. If `x` and `y` were mutable, we could use `*y` to change x because it points to the memory where `x` is stored:

```rust title="src/main.rs"
fn main() {
    let mut x = 5;
    let y = &mut x;
    *y = 10;
    assert_eq!(10, x);
}
```

Another way to think about this is that a reference in Rust is a little bit like a `Ref` from React that points to an object:

```ts title="typescript.ts"
interface Num {
  value: number;
}

interface Ref<T> {
  current: T;
}

function main() {
  const x: Num = { value: 5 };
  const y: Ref<Num> = { current: x };

  assert.equal(x.value, 5);
  assert.equal(y.current.value, 5);
}
```

In our Rust example, the `*y` is basically doing the same thing as `y.current` in our TypeScript example.

:::

### Using `Box<T>` Like a Reference

Because `Box<T>` implements `Deref`, we can use the `*` operator on it, and treat it just like a reference. This (combined with a Rust feature called _deref coercion_) means that any function that takes a `&i32` can also take a `Box<i32>`:

```rust title="src/main.rs"
fn main() {
    let x = 5;
    let y = Box::new(x);

    assert_eq!(5, x);
    assert_eq!(5, *y);
}
```

### Defining Our Own Smart Pointer

Let's create our own smart pointer so we can implement the `Deref` trait. To do this we'll create a simple "pointer" that stores a value in a generic named tuple:

```rust
struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}
```

And then, in order to let us use the `*` operator on `MyBox<T>`, we implement the `Deref` trait. This trait has only one required method for us to implement called `deref`, which borrows self and returns the inner value:

```rust
use std::ops::Deref;

impl<T> Deref for MyBox<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
```

(Since many other languages don't have tuples, a quick reminder here that in the `deref` method `self` here is a tuple, so `self.0` is the first (and only) element in the tuple, and `&self.0` returns a reference to the first element in the tuple.)

And now we can do:

```rust title="src/main.rs"
fn main() {
    let x = 5;
    let y = MyBox::new(x);

    assert_eq!(5, x);
    assert_eq!(5, *y);
}
```

When we write `*y` here (or on any object that implements `Deref`), what's actually happening is Rust is going to replace this with `*(y.deref())`.

### Implicit Deref Coercions with Functions and Methods

We've noted before that you can pass a `&String` to a function that expects a `&str`:

```rust title="src/main.rs"
fn hello(name: &str) {
    println!("Hello, {name}!");
}

fn main() {
    let x = String::from("Rust");
    hello(&x);
}
```

The reason this works is because of a feature called _deref coercion_. If we call a function that takes a reference to type `X`, but instead we pass a reference to type `Y`, then if `Y` implements `Deref` Rust will call `deref` on the value we passed in (possible more than once!) to convert it into a reference to the correct type. For example, `String` [implements the `Deref` trait](https://github.com/rust-lang/rust/blob/b0884a3528c45a5d575e182f407c759d243fdcba/library/alloc/src/string.rs#L2442-L2450) and returns a `&str`, so Rust can automatically convert a `&String` to `&str`.

If we were to pass a `&MyBox<String>` to the `hello` function above, Rust would convert it to a `&String` via `MyBox`'s `deref` method, and then into a `&str` via `String`'s `deref` method.

If Rust didn't implement deref coercion, we'd have to write something like:

```rust title="src/main.rs"
fn main() {
    let m = MyBox::new(String::from("Rust"));
    hello(&(*m)[..]);
}
```

And no one wants to write that.

### How Deref Coercion Interacts with Mutability

The `Deref` trait only works with immutable references, but there is also a `DerefMut` trait for mutable references. Rust will do deref coercion in three cases:

- If you have a `&T` and you want an `&U`, then if `T` implements `Deref` to type `&U`, then rust will take care of this for you, just like we saw above.
- If you have a `&mut T` and want an `&mut U`, this will happen in exactly the same way but here the conversion will happen via the `DerefMut` trait instead.
- If you have a `&mut T` and you want a `&U`, then Rust will use the `Deref` trait on type `T` to convert the mutable ref to an immutable `&U`.

Obviously ownership rules prevent Rust from automatically converting a `&T` to a `&mut U`.

## 15.3 - Running Code on Cleanup with the `Drop` trait

The `Drop` trait allows us to specify some code that must be run whenever a struct is dropped (i.e. when it goes out of scope). The `Drop` trait is almost always used when implementing a smart pointer. `Box<T>` implements `Drop` so it can clean up the memory it is using on the heap. The `Rc<T>` type (which will talk about in the [next section](#154---rct-the-reference-counted-smart-pointer)) implements `Drop` so it can decrement a reference count.

`Drop` can also be used to clean up other resources. If you have a struct that opens a network connection in its constructor, you can implement the `Drop` trait to ensure the network connection is closed when the struct is dropped, ensuring you won't leak any resources. This is a pattern borrowed from C++ called ["Resource Acquisition Is Initialization" or RAII](https://en.cppreference.com/w/cpp/language/raii).

The `Drop` trait is included in the prelude, and has only one required method named `drop`. Let's see an example:

```rust title="src/main.rs"
struct CustomSmartPointer {
    data: String,
}

impl Drop for CustomSmartPointer {
    fn drop(&mut self) {
        println!("Dropping CustomSmartPointer with data `{}`!", self.data);
    }
}

fn main() {
    let c = CustomSmartPointer {
        data: String::from("my stuff"),
    };
    let d = CustomSmartPointer {
        data: String::from("other stuff"),
    };
    println!("CustomSmartPointers created.");

    // `drop` is called automatically on `c`
    // and `d` here.
}
```

If you run this, you'll see the `drop` method gets called automatically for `c` and `d` when they get dropped at the end of `main`.

### Dropping a Value Early with `std::mem::drop`

Sometimes we may want to drop a value earlier than it would normally get dropped at the end of the scope. For example, if we're using the RAII pattern to acquire some resource like a lock or a network connection, we may want to drop that value early to release that resource before we reach the end of the function.

We cannot simply call the `drop` method on a type, however, as the Rust compiler is going to call it for us, and we don't want to _double free_ any memory or resources by calling `drop` twice. Instead we can call `std::mem::drop`, passing in the value we want to drop:

```rust
fn main() {
    let c = CustomSmartPointer {
        data: String::from("some data"),
    };
    println!("CustomSmartPointer created.");
    drop(c);
    println!("CustomSmartPointer dropped before the end of main.");
}
```

## 15.4 - `Rc<T>`, the Reference Counted Smart Pointer

`Rc<T>` is a _reference counting_ smart pointer (this is why it's named `Rc`), conceptually very similar to C++'s `shared_ptr`. Note that `Rc<T>` isn't thread safe - we'll talk about a multithreaded alternative called `Arc<T>` in [chapter 16][chap16]. `Rc<T>` is used in the case where we have some data we want to use in multiple places, but we're not sure at compile time who is going to be finished with this data first.

If we model a graph as a collection of edges and nodes, then we might decide that an edge owns the nodes it connects to. But, any node could be connected to by multiple edges, and in Rust any piece of data can only have one owner. What we want want is for a node to be dropped once it's no longer attached to any edges, so we want some kind of shared ownership.

The idea behind `Rc<T>` is that it allocates some data on the heap and a counter on the heap, and sets that counter to 1. Whenever we make a clone of an `Rc<T>`, the clone points to the same memory and the same counter, and increments the counter by one. Whenever an `Rc<T>` is dropped, it decrements the counter by 1 and if the counter is 0 then it can safely free the memory on the heap. Each instance of `Rc<T>` is only owned by one variable, just like normal Rust ownership rules. `Rc<T>` is quite a small data structure - really just a pointer - so it is quite inexpensive to copy. The end result is something that looks and behaves a lot lie multiple ownership.

### Using `Rc<T>` to Share Data

Let's see a concrete example. Lets go back to our cons list, but we'll do something slightly unusual, and join three lists together:

```rust title="src/main.rs"
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use crate::List::{Cons, Nil};

fn main() {
    let a = Cons(5, Box::new(Cons(10, Box::new(Nil))));
    let b = Cons(3, Box::new(a));
    let c = Cons(4, Box::new(a)); // This doesn't work!
}
```

We have list `a`, and then we make this the tail of both list `b` and list `c`. We're essentially trying to create this data structure:

![Diagram of Cons list](./images/conslist.svg)

The problem we're going to run into here is that the `Box<T>` type owns the value we put in it, so when we create `b` we move `a` into a `Box<T>`. When we try to create `c`, `a` has already been moved, so we can't move it again.

We could fix this particular example with some lifetime references, but that won't work in all situations, so instead we'll fix this with `Rc<T>`:

```rust title="src/main.rs"
enum List {
    Cons(i32, Rc<List>),
    Nil,
}

use crate::List::{Cons, Nil};
use std::rc::Rc;

fn main() {
    let a = Rc::new(Cons(5, Rc::new(Cons(10, Rc::new(Nil)))));
    let b = Cons(3, Rc::clone(&a));
    let c = Cons(4, Rc::clone(&a));

    println!("count after creating c = {}", Rc::strong_count(&a));
}
```

Now instead `a` is an `Rc`, and instead of `b` and `c` taking ownership of `a`, they each make a clone of `a` instead. Each clone increments `Rc<T>`'s internal reference count by one.

:::info

We could have called `a.clone()` instead of `Rc::clone(&a)` here - these do the same thing. We use `Rc::clone` for reasons of convention. For most types, `a.clone()` would perform a deep copy of the value and all of it's data, so a call to `a.clone()` stands out to the experienced Rust programmer as a potential performance problem. Here we use `Rc::clone(&a)` instead to signal to the reader "This is OK, we're just cloning an `Rc<T>`.

:::

We've also shown here that we can get the reference count out of an `Rc<T>`. Try experimenting with the above code and see what the count is at various points during execution. If you create a scope around `c`, you can see the reference count decrement when `c` is dropped. You may have noticed that we're calling `Rc::strong_count` to get the reference count. If you know what a weak reference is, you'll be unsurprised to learn there's also an `Rc::weak_count`, which we'll hear about more a little [later in this chapter](#preventing-reference-cycles-turning-an-rct-into-a-weakt).

Since there are multiple references to the data held by `Rc<T>`, then by Rust ownership rules, this data is going to be read only - we can't get a mutable reference to it.

## 15.5 - `RefCell<T>` and the Interior Mutability Pattern

Suppose for a moment that you're a Rust developer working on a bug in the Rust standard library. You want to keep track of how many times `to_lowercase` is called on a particular string. No problem, you can add a private member to the `String` struct called `to_lowercase_called` and increment it every time someone calls `to_lowercase`:

```rust
pub fn to_lowercase(&self) -> String {
    self.to_lowercase_called += 1;
    // --snip--
```

This would work in most languages, but in Rust `to_lowercase` borrows an immutable reference to `self`, so we can't mutate self. And obviously we can't change the signature of `to_lowercase` without breaking a lot of code.

The borrow checker stops us here, because what we're doing isn't _safe_ - we're mutating an immutable data structure and this could cause a bug elsewhere in the code. But... you and I are smarter than the compiler here. You and I know that incrementing this counter and then reading it out somewhere else isn't going to hurt anything. From any code outside the standard library, this `String` will still look like an immutable `String`. This code isn't _safe_ from a Rust compiler perspective, but neither is in _incorrect_.

Rust has a way of doing such things which is called writing _unsafe_ code, for cases where we're smarter than the compiler, and we know we can do something correctly. (Of course sometimes we only _think_ we're smarter than the compiler, and what we're doing is something that is both unsafe and incorrect, which will usually end in a panic at runtime. But in this case, where we're incrementing a counter, we're totally correct.)

In this section we're not going to write any unsafe code ourselves (see [chapter 19](./ch19/ch19-01-unsafe.md)), but we're going to make use of `RefCell<T>` which is implemented with unsafe code. `RefCell<T>` is used in a pattern called _interior mutability_ which is essentially exactly what we just described with our `to_lowercase` example. We have some object that we want to look like an immutable object from the outside world, but we want to have some internal state we can still mutate.

### A Use Case for Interior Mutability: Mock Objects

Let's look at a concrete example. We're writing code for an email server. Users have quotas, and when they get close to that quota, we want to send them a message. The message gets sent via the `Messenger` trait:

```rust
pub trait Messenger {
    fn send(&self, msg: &str);
}
```

How it actually gets sent we don't care. An implementation might send an SMS, or maybe it will - in a fit of irony - send an email and fill up their inbox even more. Here's the code that actually checks the quota:

```rust
pub struct LimitTracker<'a, T: Messenger> {
    messenger: &'a T,
    value: usize,
    max: usize,
}

impl<'a, T> LimitTracker<'a, T>
where
    T: Messenger,
{
    pub fn new(messenger: &'a T, max: usize) -> LimitTracker<'a, T> {
        LimitTracker {
            messenger,
            value: 0,
            max,
        }
    }

    pub fn set_value(&mut self, value: usize) {
        self.value = value;

        let percentage_of_max = self.value as f64 / self.max as f64;

        if percentage_of_max >= 1.0 {
            self.messenger.send("Error: You are over your quota!");
        } else if percentage_of_max >= 0.9 {
            self.messenger
                .send("Urgent warning: You've used up over 90% of your quota!");
        } else if percentage_of_max >= 0.75 {
            self.messenger
                .send("Warning: You've used up over 75% of your quota!");
        }
    }
}
```

We want to write a test case for `set_value`. To do this we'll create a `MockMessenger` that doesn't actually send a message, but just records all the messages it would have sent. We can create a private `Vec<String>` to store all these messages for testing purposes. But just like our `to_lowercase` example above we have a problem: in order to implement the `Messenger` trait, the `send` method on our `MockMessenger` must borrow `self` immutably, which means we can't mutate our vector. We'll use `RefCell<T>` to implement the interior mutability pattern here:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    struct MockMessenger {
        sent_messages: RefCell<Vec<String>>,
    }

    impl MockMessenger {
        fn new() -> MockMessenger {
            MockMessenger {
                sent_messages: RefCell::new(vec![]),
            }
        }
    }

    impl Messenger for MockMessenger {
        fn send(&self, message: &str) {
            self.sent_messages.borrow_mut().push(String::from(message));
        }
    }

    #[test]
    fn it_sends_an_over_75_percent_warning_message() {
        // --snip--

        assert_eq!(mock_messenger.sent_messages.borrow().len(), 1);
    }
}
```

`RefCell<T>` is essentially a new kind of smart pointer. It stores some value on the heap, but it lets us call `borrow` to get an immutable reference to that something and `borrow_mut` to get a mutable reference, even though the `RefCell<T>` itself is immutable.

`RefCell<T>` enforces the exact same safety rules as the borrow checker does. You can only have a single mutable reference at a time, and if you have one you can't also have any immutable references. The key difference is that normally these checks happen at compile time, but with `RefCell<T>` they happen at runtime. If we get things wrong, instead of a compiler error before we ship, our users get a panic. You can think of `RefCell<T>` as two `Rc<T>` in one - it has a reference count for immutable references, and a second reference count for mutable references (which is always either 0 or 1).

Inside `RefCell<T>` this is all managed with unsafe code, but it bundles it up behind an easy-to-understand API we can use. We say the `RefCell<T>` provides a safe API around unsafe code, which is a common idiom for unsafe code in Rust.

One final note about `RefCell<T>` is that, like `Rc<T>`, it is not thread safe.

### Having Multiple Owners of Mutable Data by Combining `Rc<T>` and `RefCell<T>`

`Rc<T>` lets us have multiple owners, `RefCell<T>` lets us mutate internal state. We can combine these powers together to make something mutable with multiple owners. Looking back to our cons list example:

```rust title="src/main.rs"
#[derive(Debug)]
enum List {
    Cons(Rc<RefCell<i32>>, Rc<List>),
    Nil,
}

use crate::List::{Cons, Nil};
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let value = Rc::new(RefCell::new(5));

    let a = Rc::new(Cons(Rc::clone(&value), Rc::new(Nil)));

    let b = Cons(Rc::new(RefCell::new(3)), Rc::clone(&a));
    let c = Cons(Rc::new(RefCell::new(4)), Rc::clone(&a));

    // We can modify the value at the end of the list,
    // even though there are multiple references
    // to it.
    *value.borrow_mut() += 10;

    println!("a after = {:?}", a);
    println!("b after = {:?}", b);
    println!("c after = {:?}", c);
}
```

## 15.6 - Reference Cycles Can Leak Memory

In C it's easy to create a memory leak; just `malloc` some memory and never free it. In a language like Rust it's not so simple, but it can definitely be done. One way to do it is with `Rc<T>`, `RefCell<T>`, and a circular reference. The problem is that `Rc<T>` uses a simple reference count to know when memory is safe to free, but if we have two `Rc<T>`s that point to each other, then even with no one else referencing them, they'll both have a reference count of 1.

In a garbage collected language like Java or JavaScript, this problem is solved using _reachability_. The two values are reachable from each other, but neither is reachable from the _root set_. We have no garbage collector in Rust, and `Rc<T>` is simply not smart enough to get out of this situation on its own, so we leak memory.

### Creating a Reference Cycle

Let's look at a slightly modified version of our cons list example, where the pointer to the next item in the list is mutable via `RefCell<T>`. We then set up two lists elements which each have a next pointing to each other:

```rust title="src/main.rs"
#[derive(Debug)]
enum List {
    Cons(i32, RefCell<Rc<List>>),
    Nil,
}

use crate::List::{Cons, Nil};
use std::cell::RefCell;
use std::rc::Rc;

impl List {
    fn tail(&self) -> Option<&RefCell<Rc<List>>> {
        match self {
            Cons(_, item) => Some(item),
            Nil => None,
        }
    }
}

fn main() {
    // Create `a` which represents the list `[5]`.
    let a = Rc::new(Cons(5, RefCell::new(Rc::new(Nil))));
    // Create `b` which represents the list `[10, 5]`
    let b = Rc::new(Cons(10, RefCell::new(Rc::clone(&a))));

    // Set a's `next` to be `b`.  `a` is now the list `[5, 10, 5, 10, 5, 10...]`.
    if let Some(link) = a.tail() {
        *link.borrow_mut() = Rc::clone(&b);
    }

    // These will both be 2, because `a` and `b` are refs to these values,
    // (which is the first count) and they also point to each other
    // (which is the second).
    println!("b rc count after changing a = {}", Rc::strong_count(&b));
    println!("a rc count after changing a = {}", Rc::strong_count(&a));

    // Uncomment the next line to see that we have a cycle;
    // it will overflow the stack
    // println!("a next item = {:?}", a.tail());
}
```

Have a quick read through that example and you'll see that both `a` and `b` end up pointing to each other. Both `a` and `b` end up with a `strong_count` of 2. When we hit the end of the `main` function, `a` will be dropped, reducing the ref count for a's `Rc<List>` to 1 (the one from `b`), and the same will happen to `b`. As a result, even though there are no more `Rc` objects left using this memory, the count is never reduced to zero and the memory will never be freed.

### Preventing Reference Cycles: Turning an `Rc<T>` into a `Weak<T>`

One way to solve the problem we presented in the previous section is to make it so some of these pointers confer ownership semantics and some do not. It doesn't lend itself well to the example we just used, so we're going to use a new example here, using a tree data structure. We're going to have `Node`s that have a mutable list of references to their children, and each child will have a reference to the parent. This structure is full of circular references: a parent node points to each child, and each child points back to the parent.

To prevent a possible memory leak, here we'll make the parent references _strong_ and the child references _weak_. In other words, if a child has a reference to a parent, that reference won't count towards the reference count that `Rc<T>` uses:

```rust title="src/main.rs"
use std::cell::RefCell;
use std::rc::{Rc, Weak};

#[derive(Debug)]
struct Node {
    value: i32,
    parent: RefCell<Weak<Node>>,
    children: RefCell<Vec<Rc<Node>>>,
}

fn main() {
    // Create a leaf node
    let leaf = Rc::new(Node {
        value: 3,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![]),
    });

    println!("leaf parent = {:?}", leaf.parent.borrow().upgrade());

    // Create a parent for the leaf node
    let branch = Rc::new(Node {
        value: 5,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![Rc::clone(&leaf)]),
    });

    // Wire up `leaf`'s parent pointer
    *leaf.parent.borrow_mut() = Rc::downgrade(&branch);

    println!("leaf parent = {:?}", leaf.parent.borrow().upgrade());
}
```

We already know that calling `rc::clone` will increment the `strong_count` for that `Rc` and return back a new `Rc` that points to the same memory. Here `Rc::downgrade` works the same way, except instead of returning an `Rc<Node>` it returns a `Weak<Node>` and instead of incrementing `strong_count` it increments `weak_count`. When an `Rc` is dropped, if the `strong_count` is decremented to 0 the underlying memory will be freed, even if the `weak_count` is still positive.

This means that whenever we want to deference a `Weak<Node>`, we have to check that there's still something in there, and the underlying memory hasn't been freed. We do this by calling `Weak::upgrade` on the `Weak<Node>`, which will return an `Option<Rc<Node>>`. If the underlying memory hasn't been cleaned up yet, then `Weak::upgrade` returns a `Some<Rc<Node>>` (the new `Rc<Node>` increments the `strong_count`, as you might expect) and if not, it returns a `None` to let you know your weak reference isn't valid anymore.

Since the relationship from child-to-parent is weak, if we drop a parent, it's `strong_count` will drop to 0, and the entire tree will end up being freed. No more leaks!

Continue to [chapter 16][chap16].

[chap16]: ./ch16-fearless-concurrency.md "Chapter 16: Fearless Concurrency"
