import time

from natnet_client import DataDescriptions, DataFrame, NatNetClient

import requests
import urllib.request

def receive_new_frame(data_frame: DataFrame):
    global num_frames
    num_frames += 1
    #if len(data_frame.rigid_bodies) != 4:
    #    return
    info = ""
    for i in range(4):
        info += str(data_frame.rigid_bodies[i].pos[0])
        info += ","
        info += str(data_frame.rigid_bodies[i].pos[1])
        info += ","
        info += str(data_frame.rigid_bodies[i].pos[2])
        info += ","
        info += str(data_frame.rigid_bodies[i].rot[0])
        info += ","
        info += str(data_frame.rigid_bodies[i].rot[1])
        info += ","
        info += str(data_frame.rigid_bodies[i].rot[2])
        info += ","
        info += str(data_frame.rigid_bodies[i].rot[3])
        info += ","
    print(data_frame.rigid_bodies[0].pos[0])
    #for body in data_frame.rigid_bodies:
        #info = {'id':body.id_num,
                #'x':body.pos[0],'y':body.pos[1],'z':body.pos[2],
                #'qx': body.rot[0], 'qy': body.rot[1], 'qz': body.rot[2], 'qw':body.rot[3]}
        #print(str(time.time_ns() // 1000000))


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
