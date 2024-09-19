import time

from natnet_client import DataDescriptions, DataFrame, NatNetClient

import requests
import urllib.request


def receive_new_frame(data_frame: DataFrame):
    global num_frames
    num_frames += 1
    for body in data_frame.rigid_bodies:
        info = {'id':body.id_num,
                'x':body.pos[0],'y':body.pos[1],'z':body.pos[2],
                'qx': body.rot[0], 'qy': body.rot[1], 'qz': body.rot[2], 'qw':body.rot[3]}
        res = requests.post('http://10.19.158.185:2024/opti-track-external', json=info)


def receive_new_desc(desc: DataDescriptions):
    print("Received data descriptions.")


num_frames = 0
if __name__ == "__main__":
    streaming_client = NatNetClient(server_ip_address="127.0.0.1", local_ip_address="127.0.0.1", use_multicast=False)
    streaming_client.on_data_description_received_event.handlers.append(receive_new_desc)
    streaming_client.on_data_frame_received_event.handlers.append(receive_new_frame)

    with streaming_client:
        streaming_client.request_modeldef()

        while True:
            time.sleep(1)
            streaming_client.update_sync()
            # print(f"Received {num_frames} frames in {i + 1}s")
            num_frames = 0
