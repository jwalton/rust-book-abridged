use std::{error::Error, time::Duration};
use tokio::{
    fs,
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    net::{TcpListener, TcpStream},
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let port = 7878u16;
    let listen_address = format!("127.0.0.1:{port}");
    let listener = TcpListener::bind(listen_address).await.unwrap();
    println!("Listening on port {}", port);

    loop {
        let (stream, _) = listener.accept().await.unwrap();
        tokio::spawn(async move {
            handle_connection(stream).await;
        });
    }
}

async fn handle_connection(mut stream: TcpStream) {
    let buf_reader = BufReader::new(&mut stream);

    let mut lines = buf_reader.lines();
    let request_line = lines.next_line().await.unwrap().unwrap();

    println!("Incoming request for {}", request_line);

    match &request_line[..] {
        "GET / HTTP/1.1" => send_response(stream, 200, "OK", "hello.html").await,
        "GET /sleep HTTP/1.1" => {
            tokio::time::sleep(Duration::from_secs(5)).await;
            send_response(stream, 200, "OK", "hello.html").await;
        }
        _ => send_response(stream, 404, "NOT FOUND", "404.html").await,
    }
}

async fn send_response(mut stream: TcpStream, code: u16, reason: &str, filename: &str) {
    let contents = fs::read_to_string(filename).await.unwrap();
    let length = contents.len();
    let response =
        format!("HTTP/1.1 {code} {reason}\r\nContent-Length: {length}\r\n\r\n{contents}");

    stream.write_all(response.as_bytes()).await.unwrap();
}
