"""Configuration settings for the application."""

import os
from pathlib import Path
from typing import List

# Application settings
APP_TITLE = "BPMN Collaborator API"
APP_VERSION = "1.0.0"

# Server settings
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# CORS settings
CORS_ORIGINS: List[str] = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:8000,http://0.0.0.0:8000"
).split(",")

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

# Static files
BASE_DIR = Path(__file__).parent.parent
STATIC_DIR = BASE_DIR / "app/static/"
STATIC_ASSETS_DIR = STATIC_DIR / "static"

# Example diagrams data
EXAMPLE_DIAGRAMS = [
    {
        "name": "Simple Approval Process",
        "xml": """<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1"/>
    <bpmn2:task id="Task_1" name="Review Application"/>
    <bpmn2:task id="Task_2" name="Approve Application"/>
    <bpmn2:endEvent id="EndEvent_1"/>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"/>
    <bpmn2:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="EndEvent_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_2" bpmnElement="Task_1">
        <dc:Bounds x="270" y="77" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_3" bpmnElement="Task_2">
        <dc:Bounds x="430" y="77" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_EndEvent_2" bpmnElement="EndEvent_1">
        <dc:Bounds x="592" y="99" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_1" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117"/>
        <di:waypoint x="270" y="117"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_2" bpmnElement="Flow_2">
        <di:waypoint x="370" y="117"/>
        <di:waypoint x="430" y="117"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_3" bpmnElement="Flow_3">
        <di:waypoint x="530" y="117"/>
        <di:waypoint x="592" y="117"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>""",
    },
    {
        "name": "Order Processing with Gateway",
        "xml": """<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="sample-diagram-2" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_2" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_2"/>
    <bpmn2:exclusiveGateway id="Gateway_1"/>
    <bpmn2:task id="Task_3" name="Process Order"/>
    <bpmn2:task id="Task_4" name="Reject Order"/>
    <bpmn2:endEvent id="EndEvent_2"/>
    <bpmn2:sequenceFlow id="Flow_4" sourceRef="StartEvent_2" targetRef="Gateway_1"/>
    <bpmn2:sequenceFlow id="Flow_5" name="Yes" sourceRef="Gateway_1" targetRef="Task_3"/>
    <bpmn2:sequenceFlow id="Flow_6" name="No" sourceRef="Gateway_1" targetRef="Task_4"/>
    <bpmn2:sequenceFlow id="Flow_7" sourceRef="Task_3" targetRef="EndEvent_2"/>
    <bpmn2:sequenceFlow id="Flow_8" sourceRef="Task_4" targetRef="EndEvent_2"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_2">
    <bpmndi:BPMNPlane id="BPMNPlane_2" bpmnElement="Process_2">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_3" bpmnElement="StartEvent_2">
        <dc:Bounds x="179" y="99" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Gateway_1" bpmnElement="Gateway_1" isMarkerVisible="true">
        <dc:Bounds x="270" y="92" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_4" bpmnElement="Task_3">
        <dc:Bounds x="380" y="77" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_5" bpmnElement="Task_4">
        <dc:Bounds x="380" y="200" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_EndEvent_3" bpmnElement="EndEvent_2">
        <dc:Bounds x="542" y="99" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_4" bpmnElement="Flow_4">
        <di:waypoint x="215" y="117"/>
        <di:waypoint x="270" y="117"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_5" bpmnElement="Flow_5">
        <di:waypoint x="320" y="117"/>
        <di:waypoint x="380" y="117"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_6" bpmnElement="Flow_6">
        <di:waypoint x="295" y="142"/>
        <di:waypoint x="295" y="240"/>
        <di:waypoint x="380" y="240"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_7" bpmnElement="Flow_7">
        <di:waypoint x="480" y="117"/>
        <di:waypoint x="542" y="117"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_8" bpmnElement="Flow_8">
        <di:waypoint x="430" y="240"/>
        <di:waypoint x="560" y="240"/>
        <di:waypoint x="560" y="135"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>""",
    },
    {
        "name": "Multi-Step Request Workflow",
        "xml": """<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="sample-diagram-3" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_3" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_3"/>
    <bpmn2:task id="Task_5" name="Submit Request"/>
    <bpmn2:task id="Task_6" name="Review Request"/>
    <bpmn2:task id="Task_7" name="Approve Request"/>
    <bpmn2:task id="Task_8" name="Notify User"/>
    <bpmn2:endEvent id="EndEvent_3"/>
    <bpmn2:sequenceFlow id="Flow_9" sourceRef="StartEvent_3" targetRef="Task_5"/>
    <bpmn2:sequenceFlow id="Flow_10" sourceRef="Task_5" targetRef="Task_6"/>
    <bpmn2:sequenceFlow id="Flow_11" sourceRef="Task_6" targetRef="Task_7"/>
    <bpmn2:sequenceFlow id="Flow_12" sourceRef="Task_7" targetRef="Task_8"/>
    <bpmn2:sequenceFlow id="Flow_13" sourceRef="Task_8" targetRef="EndEvent_3"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_3">
    <bpmndi:BPMNPlane id="BPMNPlane_3" bpmnElement="Process_3">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_4" bpmnElement="StartEvent_3">
        <dc:Bounds x="179" y="99" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_6" bpmnElement="Task_5">
        <dc:Bounds x="270" y="77" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_7" bpmnElement="Task_6">
        <dc:Bounds x="420" y="77" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_8" bpmnElement="Task_7">
        <dc:Bounds x="570" y="77" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_9" bpmnElement="Task_8">
        <dc:Bounds x="720" y="77" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_EndEvent_4" bpmnElement="EndEvent_3">
        <dc:Bounds x="872" y="99" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_9" bpmnElement="Flow_9">
        <di:waypoint x="215" y="117"/>
        <di:waypoint x="270" y="117"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_10" bpmnElement="Flow_10">
        <di:waypoint x="370" y="117"/>
        <di:waypoint x="420" y="117"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_11" bpmnElement="Flow_11">
        <di:waypoint x="520" y="117"/>
        <di:waypoint x="570" y="117"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_12" bpmnElement="Flow_12">
        <di:waypoint x="670" y="117"/>
        <di:waypoint x="720" y="117"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_Flow_13" bpmnElement="Flow_13">
        <di:waypoint x="820" y="117"/>
        <di:waypoint x="872" y="117"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>""",
    },
]

DEFAULT_DIAGRAM_XML = """<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="new-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>"""
