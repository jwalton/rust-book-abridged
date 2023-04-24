# 16 - Fearless Concurrency

Concurrent programming has a lot of potential pit falls - race conditions, thread safe access to variables - in other languages these problems show up in production as tricky to reproduce problems. Access to memory is handled through Rust's type system and ownership rules, and it turns out these rules can do an excellent job of catching many concurrency problems at compile time too.

Throughout this chapter we'll use the term _concurrent_, but we really mean _concurrent or parallel_ (concurrent meaning multiple things happening on a single CPU, and parallel meaning multiple things happening on many CPUs). A lot of what we discuss in this chapter applies to both multithreaded code and async code. We'll talk a little bit about async code in [chapter 21][chap21].

Different languages tend to use different abstractions to deal with thread safety, each with their own strengths and weaknesses. For example, Java makes use of `synchronized` blocks which take ownership of a monitor (very similar to a mutex), and your most frequent headaches in Java are deadlocks. In Go, concurrency is most frequently handled using message passing over a channel, and while deadlocks are thus rare in Go, goroutine leaks (where a goroutine is started but never terminates) are frighteningly common. Rust doesn't dictate a solution to you: Rust has both channels and mutexes and you can use whichever is a better fit for your particular problem.

## Threads for JavaScript Programmers

This book is intended to people who already know another language, and so we're skipping a lot of beginner concepts. However, JavaScript is one of the most popular languages in the world, and it doesn't deal much with threads, so we'll briefly cover some thread concepts here. If you know what "thread" and "mutex" mean, feel free to skip ahead to the next section. If not, this is far from a complete introduction to threads, but it will at least introduce the terminology you need to make it through this chapter.

If you've used JavaScript much, you know that JavaScript has an event loop. In node.js, if you call `fs.readFile(filename, {encoding: "utf-8"},  cb)`, then node will ask the OS to open `filename` and read it's contents, and once that data is available node will call into your callback. The actual reading of the file may or may not happen in some other thread, but your code all executes in a single thread, inside the event loop. Because of this, a calculation-heavy JavaScript program has a hard time making use of multiple CPUs. We say that JavaScript code can do a lot of things _concurrently_, but not so much in _parallel_. (At least, without using [web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).)

You probably already know that spawning a _thread_ is a bit like starting a second program running. You can run two threads in parallel on two different CPUs. The biggest difference between running two separate programs and running two threads is that the threads can read and write the same memory.

When two threads want to read and write to the same memory, we need some way to synchronize access to that memory. If one thread is writing part of a data structure while another is reading it, then the reader might get a partially updated data structure, or one with pointers to data that has been allocated but hasn't been initialized yet. These introduce bugs in our program called _race conditions_.

One of the most common ways to synchronize access is called a _mutex_ (short for "mutual exclusion"). Whenever a thread wants to read or write to shared memory, it _locks_ the mutex. Only one thread is allowed to own the lock on the mutex at a time, so if a second thread tries to lock the mutex, it will block until the mutex is available.

Sometimes a thread needs to access two different parts of memory, protected by two different mutexes. If a first thread tries to lock mutex `a` and then mutex `b`, and a second thread tries to lock mutex `b` and then mutex `a`, it's possible that the first thread will end up with `a` and get stuck waiting for `b`, while the second thread ends up with `b` and waits for `a`. This is called a _deadlock_ and both threads will end up waiting forever.

In this chapter we're going to talk about how to spawn threads, how to use mutexes to synchronize access, and we'll talk about channels which are a way for threads to pass messages back and forth to each other (if you are familiar with web workers, this is a little bit like `postMessage`).

## 16.1 - Using Threads to Run Code Simultaneously

If you're coming from a language like Go or Erlang, it's important to realize that threads in Rust are real, actual, OS level threads. In Go, _goroutines_ are "green threads", where multiple goroutines map to a single OS thread. In Rust, each thread is bare metal OS thread (although, it's worth noting that there are crates that implement other models of threading).

In [chapter 21][chap21] we'll talk about async programming where many I/O bound tasks (like many incoming requests to a web server) can be handled in parallel with a small number of threads, but in this chapter we're talking about plain old vanilla threads.

### Creating a New Thread with `spawn`

We start a new thread by calling `thread::spawn`, passing it a closure which will be run in the new thread:

```rust title="src/main.rs"
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {} from the spawned thread!", i);
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("hi number {} from the main thread!", i);
        thread::sleep(Duration::from_millis(1));
    }

    handle.join().unwrap();
}
```

If you run this, then as you'd expect, you'll get a mix of messages from the main thread and the spawned thread intermixed with each other.

If you comment out the call to `join` at the end of the `main` function and run this, you probably will not see all 9 numbers from the spawned thread being printed. If the main thread quits, all child threads quit immediately. Rust doesn't wait for all threads to finish to quit the program, as some languages such as Java do. The `join` function on `ThreadHandle` will cause the calling thread to wait until the thread the handle references has terminated.

### Using `move` Closures with Threads

Here's an example that doesn't compile because of an ownership problem:

```rust title="src/main.rs"
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    // This doesn't work!
    let handle = thread::spawn(|| {
        println!("Here's a vector: {:?}", v);
    });

    drop(v);

    handle.join().unwrap();
}
```

Can you spot the problem? If you need a hint, notice that `v` gets declared in the `main` function, and we reference `v` inside the closure. As you might recall from [chapter 13][chap13], Rust is going to infer that, since we're only reading from `v` inside the closure, we can borrow a reference to `v`.

The problem here is that immediately after spawning the thread, the `main` function drops `v`. This means the memory associated with the vector is going to be freed, possibly before the thread has even had a chance to run. The Rust compiler throws an error here, because the thread might not have a valid reference to `v` when it needs it. There's no way for the compiler to know.

We an fix this with the `move` keyword, which forces the closure to take ownership of `v`:

```rust
    let handle = thread::spawn(move || {
        println!("Here's a vector: {:?}", v);
    });

```

## 16.2 - Using Message Passing to Transfer Data Between Threads

Rust has _channels_, which will be very familiar to any Go programmers reading this. A channel is a bit like a FIFO queue - a producer can _transmit_ a message to the channel, and a consumer can _receive_ a message from a channel. Let's see an example:

```rust title="src/main.rs"
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
    });

    let received = rx.recv().unwrap();
    println!("Got: {}", received);
}
```

`mpsc` here stands for "multiple producers, single consumer", because this is how the channels from the standard library are implemented. The call to `mpsc::channel` returns a `Sender<String>` and `Receiver<String>` in a tuple, which we're assigning to `tx` and `rx` via a destructuring assignment.

As we saw in previous examples, we use `move` to move ownership of the `Sender` to the spawned thread. The thread needs to own the `Sender` in order to use it, which it does by calling `tx.send`. It's important to realize that `send` doesn't make a copy of the message being passed in, it takes ownership of the value and moves it to the receiving side. In effect the only thing being sent from sender to receiver is a pointer.

`send` will return an error if the receiver has already been dropped and there's nowhere to send this message. Here we're calling `unwrap` instead of properly handling the error since this is just an example.

On the receiving side, we call `rx.recv` to receive a value from the channel. This will block until a message is available. Like `send`, this will return an error if the transmitter has already been dropped (otherwise we could end up blocked waiting for a message forever). If we don't want the receiver to block, there's also a `rx.try_recv` which will return an error immediately if the channel has no messages for us. It's a fairly common pattern for the main thread to periodically check to see if there are messages available, and if not go do some other work and come back later.

### Sending Multiple Values and Seeing the Receiver Waiting

The `Receiver<T>` type implements the `Iterator` trait, which lets us handle incoming messages with a `for` loop or using other `Iterator` functions we've seen:

```rust title="src/main.rs"
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    for received in rx {
        println!("Got: {}", received);
    }
}
```

Notice that the sending thread is sleeping between sending each value. The `for received in rx` loop here will call `recv`, so it will block and wait for each message.

## 16.3 - Shared-State Concurrency

### Using Mutexes to Allow Access to Data from One Thread at a Time

First let's have a look at a single threaded program that uses a `Mutex<T>`:

```rust title="src/main.rs"
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);

    {
        let mut num = m.lock().unwrap();
        *num = 6;
    }

    println!("m = {:?}", m);
}
```

We acquire the lock with `m.lock()`. Note that `lock` returns a `LockResult<T>`. If any thread panics while it holds the mutex, then the mutex will never be unlocked, so no other thread will ever be able to take the mutex again. In this case, other threads will get back an `Err` when they call `lock`.

After we `unwrap` the `LockResult`, the `num` value here is bound to a `MutexGuard`. When the `MutexGuard` is dropped at the end of our inner scope, the mutex's lock will be released.

You'll notice that the mutex holds on to the value it's protecting inside of itself. `Mutex<T>` is basically another kind of smart pointer, or more accurately the `MutexGuard` is. `MutexGuard` implements `Deref` so we can use it like a reference to update the value inside.

Mutexes in rust are _not_ reentrant - if you hold a lock and try to acquire it a second time, this will result in a deadlock. Rust's fancy type and ownership system can protect us from many common thread safety issues, but deadlocks aren't one of them, and trying to acquire the two locks from two threads in a different order will also result in a deadlock.

### Sharing a `Mutex<T>` Between Multiple Threads

A Mutex on only one thread isn't very useful. If you recall back to how we shared a single `Sender` between multiple threads in our channels example, you might expect us to clone the mutex to pass it between multiple threads, but you'd be wrong - `Mutex<T>` doesn't implement `Clone`. We saw in [chapter 15][chap15] how we could use the `Rc<T>` smart pointer to have a single piece of data with multiple owners, but we noted it isn't thread safe, so we can't use it here.

But there's a thread-safe version of `Rc<T>` called `Arc<T>` - the "atomic reference counted" smart pointer. `Arc<T>` uses the [std::sync::atomic](https://doc.rust-lang.org/stable/std/sync/atomic/index.html) library to atomically increment and decrement it's reference count, which makes it thread safe. Why doesn't `Rc<T>` use the atomic library? How come everything isn't thread safe? Because thread safety comes with a performance penalty here, so `Rc<T>` is there when you don't need thread safety and `Arc<T>` is there for when you do.

Here's how we share a `Mutex<T>` with an `Arc<T>`:

```rust title="src/main.rs"
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();

            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

Very similar to our channels example, we `clone` the `Arc` whenever we want to `move` it into a new thread (so you were right - there was a clone in there somewhere). Note that we're still not cloning the `Mutex<T>` though. The `Arc` keeps ownership of the Mutex, allowing us to share a single mutex across multiple threads.

Notice that the `counter` variable above is declared as immutable. Much like with `RefCell<T>`, a `Mutex<T>` provides interior mutability, and we're allowed to change the value held in a mutex even if we have an immutable reference to the mutex.

## 16.4 - Extensible Concurrency with the `Sync` and `Send` traits

`Send` is a marker trait that indicates a type can be transferred between threads. Any type composed entirely of `Send` traits is automatically `Send`. Almost every type in Rust is `Send`, but we've already seen an example of one that isn't: `Rc<T>` isn't `Send`, since if you cloned it and transferred it between threads, the clone and the original might try to modify the reference count concurrently resulting in a data race. If you give this a try, you'll get a compile-time error, since `Rc<T>` is not `Send`. Raw pointers in rust (see [chapter 19][chap19]) are also not `Send`.

The closely related `Sync` marker trait is implemented by types that are safe to be referenced from multiple threads. To put it formally, a type `T` is `Sync` if `&T` is `Send`. If we can send an immutable reference to `T` to another thread, then `T` is `Sync`. `RefCell<T>` is not `Sync`. `Mutex<T>` is `Sync` which is why we can share an immutable reference across threads, as we did with `Arc<T>` in the example above.

In general we never have to implement `Send` and `Sync` on a type ourselves. They are just marker traits with no methods, and they're implemented automatically on a type if that type is composed entirely of `Send`/`Sync` members. The only cases where you'd want to implement these yourself is if you're creating new concurrency primitives, in which case you'll be using some _unsafe_ code (see [chapter 19][chap19]). There are many safety guarantees you'll have to implement yourself if you're going down this path, and you should consult [The Rustonomicon](https://doc.rust-lang.org/stable/nomicon) if you want to learn about this.

What's interesting to note here is that, aside from the `Sync` and `Send` traits, everything we've looked at in this chapter is implemented in the standard library instead of being part of the core Rust language. Many concurrency solutions are implemented in crates (such as the popular [parking_lot crate](https://crates.io/crates/parking_lot)). When we dig into async programming in [chapter 21][chap21] we'll see the same thing there, with Rust providing the `async` and `await` keywords, but with the actual runtime behavior being provided by a crate.

Continue to [chapter 17][chap17].

[chap13]: ./ch13-functional-language-features.md "Chapter 13: Functional Language Features: Iterators and Closures"
[chap15]: ./ch15-smart-pointers.md "Chapter 15: Smart Pointers"
[chap17]: ./ch17-object-oriented-features.md "Chapter 17: Object Oriented Features of Rust"
[chap19]: ./ch19/ch19-01-unsafe.md "Chapter 19: Advanced Features"
[chap21]: ./ch21-async.md "Chapter 21: Bonus Chapter: Async Programming"
